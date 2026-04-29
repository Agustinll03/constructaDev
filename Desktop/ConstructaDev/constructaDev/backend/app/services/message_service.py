import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import UnprocessableError
from app.integrations.twilio.client import send_whatsapp_message
from app.models.message import Message, MessageDirection, MessageProcessingStatus, MessageType
from app.models.responsible import Responsible
from app.models.task import Task
from app.repositories.message import MessageRepository
from app.repositories.responsible import ResponsibleRepository
from app.repositories.task import TaskRepository
from app.schemas.message import MessageCreateInternal, TwilioInboundPayload
from app.schemas.task import TaskStatusUpdate
from app.services.message_interpreter import InterpretationResult, interpret
from app.services.task_service import TaskService

logger = logging.getLogger(__name__)


class MessageService:
    def __init__(self, session: AsyncSession) -> None:
        self.msg_repo = MessageRepository(session)
        self.resp_repo = ResponsibleRepository(session)
        self.task_repo = TaskRepository(session)
        self.task_service = TaskService(session)

    async def process_inbound(
        self, payload: TwilioInboundPayload, raw_params: dict[str, Any]
    ) -> Message:
        """
        Full inbound flow:
          1. Idempotency check (duplicate MessageSid → return existing)
          2. Identify responsible by WhatsApp number
          3. Find their first active task
          4. Save inbound Message record (status=PENDING)
          5. Interpret text and apply task update if applicable
          6. Update message processing_status and ai_interpretation
          7. Send acknowledgment reply
          8. Save outbound Message record
        """
        # ── 1. Idempotency ─────────────────────────────────────────────────────
        existing = await self.msg_repo.get_by_external_id(payload.MessageSid)
        if existing:
            logger.info("Duplicate webhook for MessageSid=%s — skipping", payload.MessageSid)
            return existing

        # ── 2. Identify responsible ────────────────────────────────────────────
        responsible = await self.resp_repo.get_by_whatsapp(payload.from_number)

        # ── 3. Find active task (first by due_date) ────────────────────────────
        task = None
        if responsible:
            active_tasks = await self.task_repo.list_by_responsible(responsible.id)
            task = active_tasks[0] if active_tasks else None

        # ── 4. Save inbound message (PENDING) ─────────────────────────────────
        inbound = await self._save_message(
            MessageCreateInternal(
                direction=MessageDirection.INBOUND,
                message_type=payload.detected_type,
                from_number=payload.from_number,
                to_number=payload.to_number,
                body=payload.Body,
                media_url=payload.MediaUrl0,
                responsible_id=responsible.id if responsible else None,
                task_id=task.id if task else None,
                external_message_id=payload.MessageSid,
                raw_payload=raw_params,
                processing_status=MessageProcessingStatus.PENDING,
            )
        )

        # ── 5. Interpret and (maybe) apply task update ─────────────────────────
        reply_text, final_status, ai_data = await self._interpret_and_apply(
            body=payload.Body,
            message_type=payload.detected_type,
            responsible=responsible,
            task=task,
        )

        # ── 6. Stamp processing result back onto the inbound message ───────────
        await self.msg_repo.update_fields(
            inbound.id,
            processing_status=final_status,
            ai_interpretation=ai_data,
        )

        # ── 7. Send outbound reply ─────────────────────────────────────────────
        outbound_sid = await send_whatsapp_message(payload.from_number, reply_text)

        # ── 8. Save outbound message ───────────────────────────────────────────
        await self._save_message(
            MessageCreateInternal(
                direction=MessageDirection.OUTBOUND,
                message_type=MessageType.TEXT,
                from_number=payload.to_number,
                to_number=payload.from_number,
                body=reply_text,
                responsible_id=responsible.id if responsible else None,
                task_id=task.id if task else None,
                external_message_id=outbound_sid,
                processing_status=MessageProcessingStatus.PROCESSED,
            )
        )

        return inbound

    # ── helpers ────────────────────────────────────────────────────────────────

    async def _interpret_and_apply(
        self,
        body: str | None,
        message_type: MessageType,
        responsible: Responsible | None,
        task: Task | None,
    ) -> tuple[str, MessageProcessingStatus, dict | None]:
        """
        Returns (reply_text, processing_status, ai_interpretation_dict).

        Only TEXT messages with a linked task trigger rule matching.
        Audio/image messages stay PENDING (Whisper queue, Phase 4).
        """
        # Unknown responsible or no task → generic reply, no interpretation needed
        if responsible is None or task is None:
            return self._build_reply(responsible, task), MessageProcessingStatus.PROCESSED, None

        # Non-text messages → leave PENDING for future Whisper processing
        if message_type != MessageType.TEXT:
            reply = (
                f"Hola {responsible.full_name}. Recibimos tu mensaje multimedia "
                f"relacionado con la tarea \u00ab{task.title}\u00bb. "
                "Ser\u00e1 procesado pr\u00f3ximamente."
            )
            return reply, MessageProcessingStatus.PENDING, None

        result = interpret(body)

        if result.action == "none":
            return self._build_reply(responsible, task), MessageProcessingStatus.PROCESSED, None

        # Try to apply the status transition
        progress_to_apply = (
            result.progress if result.progress is not None else task.estimated_progress
        )
        try:
            await self.task_service.apply_status_update(
                task.id,
                TaskStatusUpdate(
                    status=result.status,
                    estimated_progress=progress_to_apply,
                    triggered_by="chatbot",
                    reason=result.reason,
                ),
            )
            reply = self._build_action_reply(responsible.full_name, task.title, result)
            ai_data = {**result.to_dict(), "applied": True, "error": None}
            return reply, MessageProcessingStatus.PROCESSED, ai_data

        except UnprocessableError as exc:
            logger.warning(
                "Could not apply rule '%s' to task %d: %s",
                result.matched_rule, task.id, exc.detail,
            )
            reply = (
                f"Hola {responsible.full_name}. Tu mensaje fue recibido, pero no se pudo "
                f"actualizar el estado de la tarea \u00ab{task.title}\u00bb: {exc.detail}"
            )
            ai_data = {**result.to_dict(), "applied": False, "error": exc.detail}
            return reply, MessageProcessingStatus.FAILED, ai_data

    async def _save_message(self, data: MessageCreateInternal) -> Message:
        msg = Message(**data.model_dump())
        return await self.msg_repo.create(msg)

    @staticmethod
    def _build_reply(responsible: Responsible | None, task: Task | None) -> str:
        if responsible is None:
            return (
                "Este n\u00famero no est\u00e1 registrado en el sistema CONSTRUCTA. "
                "Comun\u00edcate con el encargado de tu obra."
            )
        if task is None:
            return (
                f"Hola {responsible.full_name}. "
                "No ten\u00e9s tareas activas asignadas en este momento."
            )
        return (
            f"Hola {responsible.full_name}. "
            f"Recibimos tu mensaje relacionado con la tarea \u00ab{task.title}\u00bb. "
            "Gracias por reportar. El sistema registr\u00f3 tu respuesta."
        )

    @staticmethod
    def _build_action_reply(name: str, title: str, result: InterpretationResult) -> str:
        if result.action == "complete":
            return (
                f"Excelente {name}! La tarea \u00ab{title}\u00bb fue marcada como completada."
            )
        if result.action == "progress":
            return (
                f"Registrado {name}. La tarea \u00ab{title}\u00bb "
                f"tiene un avance del {result.progress}%."
            )
        if result.action == "block":
            return (
                f"Entendido {name}. La tarea \u00ab{title}\u00bb fue marcada como bloqueada. "
                "El encargado fue notificado."
            )
        return f"Hola {name}. Respuesta registrada para la tarea \u00ab{title}\u00bb."

    async def list_by_task(self, task_id: int) -> list[Message]:
        return await self.msg_repo.list_by_task(task_id)

    async def list_by_responsible(self, responsible_id: int) -> list[Message]:
        return await self.msg_repo.list_by_responsible(responsible_id)
