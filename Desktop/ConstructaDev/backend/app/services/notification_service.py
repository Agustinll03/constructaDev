"""
Proactive notification service.

Endpoints (called by n8n on schedule):
  send_reminders(days)   – WhatsApp reminders for tasks due within N days
  mark_overdue_tasks()   – TASK_OVERDUE alerts for tasks past due_date
  mark_no_response()     – NO_RESPONSE alerts for unanswered reminders

All operations respect the per-manager SystemSettings configured in the UI.
"""
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.twilio.client import send_whatsapp_message
from app.models.alert import AlertType
from app.models.message import Message, MessageDirection, MessageProcessingStatus, MessageType
from app.models.responsible import Responsible
from app.models.task import Task
from app.repositories.alert import AlertRepository
from app.repositories.message import MessageRepository
from app.repositories.obra import ObraRepository
from app.repositories.responsible import ResponsibleRepository
from app.repositories.settings import SettingsRepository
from app.repositories.task import TaskRepository
from app.services.conversation_service import ConversationService, _fmt_date

logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self, session: AsyncSession) -> None:
        self.db = session
        self.task_repo = TaskRepository(session)
        self.obra_repo = ObraRepository(session)
        self.resp_repo = ResponsibleRepository(session)
        self.msg_repo = MessageRepository(session)
        self.alert_repo = AlertRepository(session)
        self.settings_repo = SettingsRepository(session)
        self.conv_service = ConversationService(session)

    # ── public methods ─────────────────────────────────────────────────────────

    async def send_reminders(self, days: int = 3) -> int:
        """Send proactive WhatsApp reminders for tasks due within N days.

        Skips tasks whose manager has disabled auto_reminders or the specific
        reminder flag for this day window (reminder_3days / reminder_1day).
        """
        today = date.today()
        deadline = today + timedelta(days=days)
        tasks = await self.task_repo.list_due_soon_all(today, deadline)

        count = 0
        for task in tasks:
            if not task.responsible_id:
                continue
            responsible = await self.resp_repo.get(task.responsible_id)
            if not responsible or not responsible.is_active:
                continue

            cfg = await self.settings_repo.get_for_obra(task.obra_id)

            if not cfg.auto_reminders:
                logger.debug(
                    "auto_reminders disabled for obra %d — skipping task %d",
                    task.obra_id, task.id,
                )
                continue

            # Map the requested day window to the specific toggle
            if days <= 1 and not cfg.reminder_1day:
                logger.debug("reminder_1day disabled — skipping task %d", task.id)
                continue
            if days >= 3 and not cfg.reminder_3days:
                logger.debug("reminder_3days disabled — skipping task %d", task.id)
                continue

            obra = await self.obra_repo.get(task.obra_id)
            obra_name = obra.name if obra else f"Obra #{task.obra_id}"

            try:
                msg_text = await self.conv_service.seed_for_task(responsible, task, obra_name)
                outbound_sid = await send_whatsapp_message(
                    responsible.whatsapp_number, msg_text
                )
                await self._save_outbound(
                    responsible=responsible,
                    task=task,
                    body=msg_text,
                    external_sid=outbound_sid,
                    awaits_response=True,
                )
                count += 1
                logger.info("Reminder sent to %s for task %d", responsible.whatsapp_number, task.id)
            except Exception:
                logger.exception(
                    "Failed to send reminder for task %d to %s",
                    task.id,
                    responsible.whatsapp_number,
                )

        return count

    async def mark_overdue_tasks(self) -> int:
        """Create TASK_OVERDUE alerts for tasks past their due_date.

        Skips tasks whose manager has disabled the alert_overdue setting.
        """
        today = date.today()
        tasks = await self.task_repo.list_overdue(today)
        count = 0
        for task in tasks:
            cfg = await self.settings_repo.get_for_obra(task.obra_id)

            if not cfg.alert_overdue:
                logger.debug(
                    "alert_overdue disabled for obra %d — skipping task %d",
                    task.obra_id, task.id,
                )
                continue

            msg = (
                f"La tarea '{task.title}' está vencida "
                f"(venció el {_fmt_date(task.due_date)})."
            )
            if not await self.alert_repo.exists_for_task(task.id, AlertType.TASK_OVERDUE, msg):
                await self.alert_repo.create_alert(
                    alert_type=AlertType.TASK_OVERDUE,
                    message=msg,
                    obra_id=task.obra_id,
                    task_id=task.id,
                )
                count += 1
        return count

    async def mark_no_response(self, timeout_hours: int | None = None) -> int:
        """Create NO_RESPONSE alerts for unanswered reminders.

        Uses max_response_hours from the manager's SystemSettings unless an
        explicit timeout_hours is provided (e.g. from an API override).
        Skips tasks whose manager has disabled alert_no_response.
        """
        cutoff_default = datetime.now(timezone.utc) - timedelta(hours=timeout_hours or 24)
        since = cutoff_default - timedelta(hours=timeout_hours or 24)
        outbound_msgs = await self.msg_repo.list_recent_outbound(since=since)

        notifications = [
            m for m in outbound_msgs
            if (
                m.ai_interpretation
                and m.ai_interpretation.get("awaits_response")
            )
        ]

        count = 0
        for outbound in notifications:
            if not outbound.responsible_id or not outbound.task_id:
                continue

            task = await self.task_repo.get(outbound.task_id)
            if not task:
                continue

            cfg = await self.settings_repo.get_for_obra(task.obra_id)

            if not cfg.alert_no_response:
                continue

            # Use settings max_response_hours unless caller passed an override
            effective_hours = timeout_hours if timeout_hours is not None else cfg.max_response_hours
            cutoff = datetime.now(timezone.utc) - timedelta(hours=effective_hours)

            msg_created = outbound.created_at.replace(tzinfo=timezone.utc)
            if msg_created >= cutoff:
                # Not enough time has passed yet
                continue

            has_reply = await self.msg_repo.has_inbound_after(
                outbound.responsible_id, outbound.created_at
            )
            if has_reply:
                continue

            responsible = await self.resp_repo.get(outbound.responsible_id)
            resp_name = responsible.full_name if responsible else f"Responsable #{outbound.responsible_id}"

            msg = f"Sin respuesta de {resp_name} para la tarea '{task.title}'."
            if not await self.alert_repo.exists_for_task(task.id, AlertType.NO_RESPONSE, msg):
                await self.alert_repo.create_alert(
                    alert_type=AlertType.NO_RESPONSE,
                    message=msg,
                    obra_id=task.obra_id,
                    task_id=task.id,
                )
                count += 1

        return count

    # ── helpers ────────────────────────────────────────────────────────────────

    async def _save_outbound(
        self,
        responsible: Responsible,
        task: Task,
        body: str,
        external_sid: str | None,
        awaits_response: bool = False,
    ) -> Message:
        from app.core.config import settings

        msg = Message(
            direction=MessageDirection.OUTBOUND,
            message_type=MessageType.TEXT,
            from_number=settings.TWILIO_WHATSAPP_NUMBER,
            to_number=responsible.whatsapp_number,
            body=body,
            responsible_id=responsible.id,
            task_id=task.id,
            external_message_id=external_sid,
            processing_status=MessageProcessingStatus.PROCESSED,
            ai_interpretation={"notification_type": "reminder", "awaits_response": awaits_response},
        )
        return await self.msg_repo.create(msg)
