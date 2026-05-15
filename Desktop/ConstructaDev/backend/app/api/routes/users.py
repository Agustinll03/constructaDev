from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.core.deps import AdminUser, CurrentUser, DbSession
from app.core.exceptions import ConflictError
from app.repositories.user import UserRepository
from app.schemas.user import InviteRequest, InviteResponse, UserRead
from app.services.auth_service import AuthService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
async def me(current_user: CurrentUser):
    return current_user


@router.get("", response_model=list[UserRead])
async def list_members(current_user: AdminUser, db: DbSession):
    return await UserRepository(db).list_all()


@router.post("/invite", response_model=InviteResponse, status_code=201)
async def invite_member(data: InviteRequest, current_user: AdminUser, db: DbSession):
    try:
        _, token = await AuthService(db).invite(data)
    except ConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))
    invite_url = f"{settings.FRONTEND_URL}/invite/{token}"
    return InviteResponse(invite_token=token, invite_url=invite_url)


@router.delete("/{user_id}", status_code=204)
async def remove_member(user_id: int, current_user: AdminUser, db: DbSession):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="No podés eliminarte a vos mismo")
    repo = UserRepository(db)
    target = await repo.get(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if target.role == "admin":
        raise HTTPException(status_code=400, detail="No se puede eliminar a otro administrador")
    await repo.delete(user_id)
