from typing import Annotated

from fastapi import APIRouter, Query, status

from app.core.deps import CurrentUserId, DbSession
from app.schemas.responsible import ResponsibleCreate, ResponsibleRead, ResponsibleUpdate
from app.services.responsible_service import ResponsibleService

router = APIRouter(prefix="/responsibles", tags=["responsibles"])


@router.post("", response_model=ResponsibleRead, status_code=status.HTTP_201_CREATED)
async def create_responsible(
    data: ResponsibleCreate, db: DbSession, _: CurrentUserId
):
    return await ResponsibleService(db).create(data)


@router.get("", response_model=list[ResponsibleRead])
async def list_responsibles(
    db: DbSession,
    _: CurrentUserId,
    active_only: Annotated[bool, Query()] = False,
):
    return await ResponsibleService(db).list_all(active_only=active_only)


@router.get("/{responsible_id}", response_model=ResponsibleRead)
async def get_responsible(
    responsible_id: int, db: DbSession, _: CurrentUserId
):
    return await ResponsibleService(db).get_or_raise(responsible_id)


@router.patch("/{responsible_id}", response_model=ResponsibleRead)
async def update_responsible(
    responsible_id: int, data: ResponsibleUpdate, db: DbSession, _: CurrentUserId
):
    return await ResponsibleService(db).update(responsible_id, data)


@router.patch("/{responsible_id}/reactivate", response_model=ResponsibleRead)
async def reactivate_responsible(responsible_id: int, db: DbSession, _: CurrentUserId):
    """Re-activate an inactive responsible. No task reassignment is performed."""
    return await ResponsibleService(db).reactivate(responsible_id)


@router.delete("/{responsible_id}", response_model=ResponsibleRead)
async def deactivate_responsible(responsible_id: int, db: DbSession, _: CurrentUserId):
    """Soft-delete: sets is_active=False. Does not remove from DB."""
    return await ResponsibleService(db).deactivate(responsible_id)
