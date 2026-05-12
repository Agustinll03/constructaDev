import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import alerts, auth, events, notifications, obras, responsibles, tasks, webhooks
from app.api.routes import settings as settings_router
from app.core.config import settings
from app.core.socket_manager import sio

# ── FastAPI app (HTTP routes) ──────────────────────────────────────────────────
fastapi_app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    docs_url="/docs",
    redoc_url=None,
)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"

fastapi_app.include_router(auth.router, prefix=API_PREFIX)
fastapi_app.include_router(obras.router, prefix=API_PREFIX)
fastapi_app.include_router(responsibles.router, prefix=API_PREFIX)
fastapi_app.include_router(tasks.router, prefix=API_PREFIX)
fastapi_app.include_router(webhooks.router, prefix=API_PREFIX)
fastapi_app.include_router(alerts.router, prefix=API_PREFIX)
fastapi_app.include_router(notifications.router, prefix=API_PREFIX)
fastapi_app.include_router(settings_router.router, prefix=API_PREFIX)
fastapi_app.include_router(events.router, prefix=API_PREFIX)


@fastapi_app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "app": settings.APP_NAME}


# ── Top-level ASGI app: Socket.IO wraps FastAPI ────────────────────────────────
# uvicorn must run `app.main:app` (this variable).
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)
