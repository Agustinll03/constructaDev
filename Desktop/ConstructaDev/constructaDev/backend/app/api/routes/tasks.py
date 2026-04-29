from fastapi import APIRouter, status

from app.core.deps import CurrentUserId, DbSession
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.services.alert_service import AlertService
from app.services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(data: TaskCreate, db: DbSession, user_id: CurrentUserId):
    return await TaskService(db).create(data, user_id)


@router.get("/obra/{obra_id}", response_model=list[TaskRead])
async def list_tasks_for_obra(obra_id: int, db: DbSession, user_id: CurrentUserId):
    tasks = await TaskService(db).list_by_obra(obra_id, user_id)
    await AlertService(db).evaluate_task_risks_for_obra(obra_id)
    return tasks


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(task_id: int, db: DbSession, user_id: CurrentUserId):
    return await TaskService(db).get_for_manager(task_id, user_id)


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: int, data: TaskUpdate, db: DbSession, user_id: CurrentUserId
):
    return await TaskService(db).update(task_id, data, user_id)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: int, db: DbSession, user_id: CurrentUserId):
    await TaskService(db).delete(task_id, user_id)
