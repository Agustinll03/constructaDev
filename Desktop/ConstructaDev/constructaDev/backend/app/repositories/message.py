from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.message import Message, MessageDirection, MessageProcessingStatus
from app.repositories.base import BaseRepository


class MessageRepository(BaseRepository[Message]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Message, session)

    async def get_by_external_id(self, external_message_id: str) -> Message | None:
        result = await self.session.execute(
            select(Message).where(Message.external_message_id == external_message_id)
        )
        return result.scalar_one_or_none()

    async def list_by_task(
        self, task_id: int, limit: int = 50
    ) -> list[Message]:
        result = await self.session.execute(
            select(Message)
            .where(Message.task_id == task_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_by_responsible(
        self, responsible_id: int, limit: int = 50
    ) -> list[Message]:
        result = await self.session.execute(
            select(Message)
            .where(Message.responsible_id == responsible_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_pending_processing(self) -> list[Message]:
        """Inbound messages that have not yet been processed by AI (Phase 3)."""
        result = await self.session.execute(
            select(Message).where(
                Message.direction == MessageDirection.INBOUND,
                Message.processing_status == MessageProcessingStatus.PENDING,
            ).order_by(Message.created_at.asc())
        )
        return list(result.scalars().all())
