from datetime import date
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.task import Task, TaskStatus
from app.repositories.base import BaseRepository


class TaskRepository(BaseRepository[Task]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Task, session)

    async def list_by_obra(self, obra_id: int) -> list[Task]:
        result = await self.session.execute(
            select(Task)
            .where(Task.obra_id == obra_id)
            .order_by(Task.order_index, Task.id)
        )
        return list(result.scalars().all())

    async def list_by_responsible(self, responsible_id: int) -> list[Task]:
        result = await self.session.execute(
            select(Task)
            .where(
                Task.responsible_id == responsible_id,
                Task.status.notin_([TaskStatus.COMPLETADA, TaskStatus.CANCELADA]),
            )
            .order_by(Task.due_date.nulls_last())
        )
        return list(result.scalars().all())

    async def list_overdue(self, as_of: date) -> list[Task]:
        result = await self.session.execute(
            select(Task).where(
                Task.due_date < as_of,
                Task.status.notin_([TaskStatus.COMPLETADA, TaskStatus.CANCELADA]),
            )
        )
        return list(result.scalars().all())

    async def unassign_active_tasks_by_responsible(
        self, responsible_id: int
    ) -> list[Task]:
        result = await self.session.execute(
            select(Task).where(
                Task.responsible_id == responsible_id,
                Task.status.notin_([TaskStatus.COMPLETADA, TaskStatus.CANCELADA]),
            )
        )
        tasks = list(result.scalars().all())
        if tasks:
            task_ids = [t.id for t in tasks]
            await self.session.execute(
                update(Task)
                .where(Task.id.in_(task_ids))
                .values(responsible_id=None)
            )
            for task in tasks:
                await self.session.refresh(task)
        return tasks

    async def update_status(
        self,
        task_id: int,
        status: TaskStatus,
        progress: int,
        completed_date: date | None = None,
    ) -> Task | None:
        fields: dict = {"status": status, "estimated_progress": progress}
        if completed_date is not None:
            fields["completed_date"] = completed_date
        return await self.update_fields(task_id, **fields)
