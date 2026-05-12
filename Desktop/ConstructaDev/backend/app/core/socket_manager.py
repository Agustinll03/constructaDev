"""
Socket.IO server singleton.

Architecture:
  - One room per obra: "obra_{id}"
  - On connect: validate JWT, join all rooms for manager's obras
  - On task change: emit 'task_updated' to the relevant obra room
  - Only the manager who owns the obra receives the event (room isolation)
"""
import logging

import jwt
import socketio

from app.core.database import AsyncSessionLocal
from app.core.security import decode_access_token

logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)


@sio.event
async def connect(sid: str, environ: dict, auth: dict | None) -> None:
    token = (auth or {}).get("token", "")
    if not token:
        raise ConnectionRefusedError("no token")
    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise ConnectionRefusedError("invalid token")

    await sio.save_session(sid, {"user_id": user_id})

    # Join one room per obra managed by this user
    from app.repositories.obra import ObraRepository

    async with AsyncSessionLocal() as db:
        obras = await ObraRepository(db).list_by_manager(user_id)
        for obra in obras:
            await sio.enter_room(sid, f"obra_{obra.id}")

    logger.debug("Socket connected sid=%s user_id=%d obras=%d", sid, user_id, len(obras))


@sio.event
async def disconnect(sid: str) -> None:
    logger.debug("Socket disconnected sid=%s", sid)


async def emit_task_updated(task) -> None:
    """Emit task_updated to the obra room. Called from ConversationService."""
    payload = {
        "taskId": task.id,
        "obraId": task.obra_id,
        "responsableId": task.responsible_id,
        "status": task.status.value,
        "estimatedProgress": task.estimated_progress,
        "dueDate": str(task.due_date) if task.due_date else None,
        "updatedAt": task.updated_at.isoformat(),
    }
    await sio.emit("task_updated", payload, room=f"obra_{task.obra_id}")
    logger.debug("Emitted task_updated taskId=%d obraId=%d", task.id, task.obra_id)
