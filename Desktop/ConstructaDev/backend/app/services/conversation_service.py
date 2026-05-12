"""
Structured menu-based conversation state machine for WhatsApp chatbot.

Flow:
  idle       → 0 tasks: "sin tareas"
             → 1 task:  show status menu directly
             → N tasks: show numbered task list
  task_select → user sends "1"/"2"/...  → advance to status_menu
  status_menu → "1" en curso / "2" finalizada / "3" demorada / "4" reprogramar fecha
  await_date  → user sends DD/MM or DD/MM/AAAA → update due_date

Session expires after 30 minutes of inactivity.
"""
import re
from datetime import date, datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.socket_manager import emit_task_updated
from app.models.conversation_session import ConversationSession, ConversationStep
from app.models.responsible import Responsible
from app.models.task import Task, TaskStatus
from app.repositories.conversation_session import ConversationSessionRepository
from app.repositories.historial import HistorialRepository
from app.repositories.obra import ObraRepository
from app.repositories.task import TaskRepository
from app.schemas.task import TaskStatusUpdate
from app.services.message_templates import (
    build_already_in_status_message,
    build_confirmation_message,
    build_no_tasks_message,
    build_reminder_message,
    build_reschedule_confirmation_message,
    build_reschedule_request_message,
    build_status_menu_message,
    build_task_list_message,
    fmt_date,
    fmt_date_full,
)
from app.services.task_service import TaskService

_DATE_RE = re.compile(r"^(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?$")


def _task_option(idx: int, task: Task, obra_name: str) -> dict:
    return {
        "idx":       idx,
        "id":        task.id,
        "title":     task.title,
        "obra_name": obra_name,
        "due_date":  fmt_date(task.due_date),
    }


def _parse_option(body: str | None, max_val: int = 4) -> int | None:
    if not body:
        return None
    s = body.strip()
    if s.isdigit():
        n = int(s)
        if 1 <= n <= max_val:
            return n
    return None


def _parse_date(body: str | None) -> date | None:
    if not body:
        return None
    m = _DATE_RE.match(body.strip())
    if not m:
        return None
    day, month = int(m.group(1)), int(m.group(2))
    year_raw = m.group(3)

    if year_raw:
        year = int(year_raw)
        if year < 100:
            year += 2000
    else:
        from datetime import timedelta
        today = date.today()
        year = today.year
        try:
            candidate = date(year, month, day)
        except ValueError:
            return None
        if candidate < today - timedelta(days=7):
            year += 1

    try:
        return date(year, month, day)
    except ValueError:
        return None


class ConversationService:
    def __init__(self, session: AsyncSession) -> None:
        self.db = session
        self.task_repo = TaskRepository(session)
        self.obra_repo = ObraRepository(session)
        self.historial = HistorialRepository(session)
        self.session_repo = ConversationSessionRepository(session)
        self.task_service = TaskService(session)

    # ── public entry point ─────────────────────────────────────────────────────

    async def handle_inbound(
        self, responsible: Responsible, body: str | None
    ) -> tuple[str, int | None]:
        """
        Process one inbound text message.
        Returns (reply_text, task_id_or_None).
        """
        conv = await self.session_repo.get_by_responsible(responsible.id)
        now = datetime.now(timezone.utc)
        is_expired = conv is None or conv.expires_at.replace(tzinfo=timezone.utc) < now

        if is_expired or conv.step == ConversationStep.IDLE:
            return await self._start_fresh(responsible)

        if conv.step == ConversationStep.TASK_SELECT:
            return await self._handle_task_select(responsible, conv, body)

        if conv.step == ConversationStep.STATUS_MENU:
            return await self._handle_status_menu(responsible, conv, body)

        if conv.step == ConversationStep.AWAIT_DATE:
            return await self._handle_await_date(responsible, conv, body)

        return await self._start_fresh(responsible)

    async def seed_for_task(
        self, responsible: Responsible, task: Task, obra_name: str
    ) -> str:
        """
        Called by NotificationService before sending a proactive reminder.
        Seeds a STATUS_MENU session so the user's reply is immediately routed.
        Returns the reminder message text to send.
        """
        opt = _task_option(1, task, obra_name)
        await self.session_repo.upsert(
            responsible.id,
            ConversationStep.STATUS_MENU,
            selected_task_id=task.id,
            task_options=[opt],
        )
        return build_reminder_message(
            responsible.full_name,
            task_name=opt["title"],
            obra_name=opt["obra_name"],
            due_date=opt["due_date"],
        )

    # ── step handlers ──────────────────────────────────────────────────────────

    async def _start_fresh(self, responsible: Responsible) -> tuple[str, int | None]:
        tasks = await self.task_repo.list_by_responsible(responsible.id)

        if not tasks:
            await self.session_repo.upsert(responsible.id, ConversationStep.IDLE)
            return build_no_tasks_message(responsible.full_name), None

        if len(tasks) == 1:
            task = tasks[0]
            obra = await self.obra_repo.get(task.obra_id)
            obra_name = obra.name if obra else f"Obra #{task.obra_id}"
            opt = _task_option(1, task, obra_name)
            await self.session_repo.upsert(
                responsible.id,
                ConversationStep.STATUS_MENU,
                selected_task_id=task.id,
                task_options=[opt],
            )
            return (
                build_status_menu_message(
                    responsible.full_name,
                    task_name=opt["title"],
                    obra_name=opt["obra_name"],
                    due_date=opt["due_date"],
                ),
                task.id,
            )

        options = []
        for i, task in enumerate(tasks, start=1):
            obra = await self.obra_repo.get(task.obra_id)
            obra_name = obra.name if obra else f"Obra #{task.obra_id}"
            options.append(_task_option(i, task, obra_name))
        await self.session_repo.upsert(
            responsible.id, ConversationStep.TASK_SELECT, task_options=options
        )
        return build_task_list_message(responsible.full_name, options), None

    async def _handle_task_select(
        self,
        responsible: Responsible,
        conv: ConversationSession,
        body: str | None,
    ) -> tuple[str, int | None]:
        options = conv.task_options or []
        n = _parse_option(body, max_val=len(options)) if body else None

        if n is None or n < 1 or n > len(options):
            await self.session_repo.upsert(
                responsible.id, ConversationStep.TASK_SELECT, task_options=options
            )
            menu = build_task_list_message(responsible.full_name, options)
            prefix = "Opción inválida.\n\n" if body and body.strip() else ""
            return prefix + menu, None

        chosen = options[n - 1]
        await self.session_repo.upsert(
            responsible.id,
            ConversationStep.STATUS_MENU,
            selected_task_id=chosen["id"],
            task_options=options,
        )
        return (
            build_status_menu_message(
                responsible.full_name,
                task_name=chosen["title"],
                obra_name=chosen["obra_name"],
                due_date=chosen["due_date"],
            ),
            chosen["id"],
        )

    async def _handle_status_menu(
        self,
        responsible: Responsible,
        conv: ConversationSession,
        body: str | None,
    ) -> tuple[str, int | None]:
        n = _parse_option(body)
        task_id = conv.selected_task_id
        options = conv.task_options or []
        opt = next((o for o in options if o["id"] == task_id), None)

        if n is None:
            await self.session_repo.upsert(
                responsible.id,
                ConversationStep.STATUS_MENU,
                selected_task_id=task_id,
                task_options=options,
            )
            if opt:
                menu = build_status_menu_message(
                    responsible.full_name,
                    task_name=opt["title"],
                    obra_name=opt["obra_name"],
                    due_date=opt["due_date"],
                )
            else:
                menu = "Error interno. Intentá de nuevo."
            prefix = "Opción inválida.\n\n" if body and body.strip() else ""
            return prefix + menu, task_id

        try:
            if n == 1:
                reply = await self._apply_en_curso(responsible, task_id, opt)
            elif n == 2:
                reply = await self._apply_finalizada(responsible, task_id, opt)
            elif n == 3:
                reply = await self._apply_demorada(responsible, task_id, opt)
            else:
                # Option 4: reschedule date
                await self.session_repo.upsert(
                    responsible.id,
                    ConversationStep.AWAIT_DATE,
                    selected_task_id=task_id,
                    task_options=options,
                )
                title = opt["title"] if opt else f"Tarea #{task_id}"
                due = opt["due_date"] if opt else "sin fecha"
                return build_reschedule_request_message(title, due), task_id
        except Exception:
            await self.session_repo.upsert(responsible.id, ConversationStep.IDLE)
            return "Ocurrió un error al actualizar la tarea. Por favor intentá de nuevo.", task_id

        await self.session_repo.upsert(responsible.id, ConversationStep.IDLE)
        if task_id:
            task = await self.task_repo.get(task_id)
            if task:
                await emit_task_updated(task)
        return reply, task_id

    async def _handle_await_date(
        self,
        responsible: Responsible,
        conv: ConversationSession,
        body: str | None,
    ) -> tuple[str, int | None]:
        task_id = conv.selected_task_id
        options = conv.task_options or []
        opt = next((o for o in options if o["id"] == task_id), None)
        title = opt["title"] if opt else f"Tarea #{task_id}"
        current_due = opt["due_date"] if opt else "sin fecha"

        new_date = _parse_date(body)
        if new_date is None:
            await self.session_repo.upsert(
                responsible.id,
                ConversationStep.AWAIT_DATE,
                selected_task_id=task_id,
                task_options=options,
            )
            return (
                "Formato inválido.\n\n"
                + build_reschedule_request_message(title, current_due),
                task_id,
            )

        if task_id:
            task = await self.task_repo.get(task_id)
            old_due_date = task.due_date if task else None
            await self.task_repo.update_fields(task_id, due_date=new_date)
            task = await self.task_repo.get(task_id)
            if task:
                await self.historial.log(
                    obra_id=task.obra_id,
                    task_id=task_id,
                    event_type="task_rescheduled",
                    description=f"Fecha reprogramada: {fmt_date(old_due_date)} → {fmt_date(new_date)}",
                    payload={
                        "from": str(old_due_date) if old_due_date else None,
                        "to": str(new_date),
                    },
                    triggered_by="chatbot",
                )

        await self.session_repo.upsert(responsible.id, ConversationStep.IDLE)
        if task_id:
            task = await self.task_repo.get(task_id)
            if task:
                await emit_task_updated(task)

        return (
            build_reschedule_confirmation_message(
                responsible.full_name, title, fmt_date_full(new_date)
            ),
            task_id,
        )

    # ── action helpers ─────────────────────────────────────────────────────────

    async def _apply_en_curso(
        self, responsible: Responsible, task_id: int | None, opt: dict | None
    ) -> str:
        if not task_id:
            return "No se encontró la tarea."
        task = await self.task_repo.get(task_id)
        if not task:
            return "La tarea no fue encontrada."
        title = opt["title"] if opt else task.title

        if task.status == TaskStatus.EN_PROGRESO:
            return build_already_in_status_message(
                responsible.full_name, title, "en_progreso"
            )

        await self.task_service.apply_status_update(
            task_id,
            TaskStatusUpdate(
                status=TaskStatus.EN_PROGRESO,
                estimated_progress=task.estimated_progress,
                triggered_by="chatbot",
                reason="En curso vía WhatsApp",
            ),
        )
        return build_confirmation_message(responsible.full_name, title, "en_progreso")

    async def _apply_finalizada(
        self, responsible: Responsible, task_id: int | None, opt: dict | None
    ) -> str:
        if not task_id:
            return "No se encontró la tarea."
        task = await self.task_repo.get(task_id)
        if not task:
            return "La tarea no fue encontrada."
        title = opt["title"] if opt else task.title

        if task.status == TaskStatus.COMPLETADA:
            return build_already_in_status_message(
                responsible.full_name, title, "completada"
            )

        await self.task_service.force_complete(task_id, triggered_by="chatbot")
        return build_confirmation_message(responsible.full_name, title, "completada")

    async def _apply_demorada(
        self, responsible: Responsible, task_id: int | None, opt: dict | None
    ) -> str:
        if not task_id:
            return "No se encontró la tarea."
        task = await self.task_repo.get(task_id)
        if not task:
            return "La tarea no fue encontrada."
        title = opt["title"] if opt else task.title

        if task.status == TaskStatus.BLOQUEADA:
            return build_already_in_status_message(
                responsible.full_name, title, "bloqueada"
            )

        await self.task_service.force_block(task_id, triggered_by="chatbot")
        return build_confirmation_message(responsible.full_name, title, "bloqueada")
