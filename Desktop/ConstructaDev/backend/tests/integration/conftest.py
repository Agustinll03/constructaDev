"""
Fixtures compartidas para todos los tests de integración.

Estrategia:
- Se usa una base de datos PostgreSQL separada: constructa_test
- Las tablas se crean corriendo las migraciones de Alembic (maneja enums PostgreSQL)
- Se hace override del dependency get_db para inyectar la sesión de test
- El cliente HTTP apunta a fastapi_app directamente (sin el wrapper Socket.IO)
- NullPool evita que asyncpg reutilice conexiones en estado sucio entre tests
"""

import os
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

# Apuntar a la BD de test ANTES de que se cargue cualquier módulo de la app.
TEST_DB_URL = "postgresql+asyncpg://postgres:Plufo2016@localhost:5432/constructa_test"

os.environ["DATABASE_URL"] = TEST_DB_URL
os.environ["SECRET_KEY"] = "test-secret-key-for-integration-tests"

# Limpiar la caché de settings para que tome la nueva DATABASE_URL
from app.core.config import get_settings
get_settings.cache_clear()

from app.core.database import Base, get_db
from app.main import fastapi_app

# ── Motor y sesión de test ──────────────────────────────────────────────────────
# NullPool: cada connect() crea una conexión nueva, cada close() la descarta.
# Evita que asyncpg reutilice conexiones en estado sucio entre tests.

engine_test = create_async_engine(TEST_DB_URL, echo=False, poolclass=NullPool)
TestSession = async_sessionmaker(engine_test, class_=AsyncSession, expire_on_commit=False)


# ── Aplicar migraciones de Alembic una vez por sesión ─────────────────────────
# Subprocess para evitar conflictos con el event loop de pytest-asyncio.
# El env.py de Alembic llama a asyncio.run() internamente.

def _run_alembic(*args: str) -> None:
    import subprocess, sys
    env = os.environ.copy()
    env["DATABASE_URL"] = TEST_DB_URL
    result = subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        capture_output=True, text=True, env=env,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Alembic {' '.join(args)} falló:\n{result.stderr}")


@pytest.fixture(scope="session", autouse=True)
def crear_tablas():
    """Corre 'alembic upgrade head' al inicio y 'downgrade base' al final."""
    _run_alembic("downgrade", "base")
    _run_alembic("upgrade", "head")
    yield
    _run_alembic("downgrade", "base")


# ── Limpiar tablas entre cada test ─────────────────────────────────────────────

@pytest_asyncio.fixture(autouse=True)
async def limpiar_tablas():
    """
    TRUNCATE de todas las tablas después de cada test.
    CASCADE respeta las FK. RESTART IDENTITY reinicia las secuencias.
    Una sola instrucción SQL es atómica y más confiable que múltiples DELETEs.
    """
    yield
    tabla_names = ", ".join(t.name for t in reversed(Base.metadata.sorted_tables))
    async with engine_test.begin() as conn:
        await conn.execute(text(
            f"TRUNCATE {tabla_names} RESTART IDENTITY CASCADE"
        ))


# ── Override del dependency get_db ─────────────────────────────────────────────

@pytest_asyncio.fixture(autouse=True)
async def override_db():
    """Reemplaza get_db de FastAPI con una sesión apuntando a la BD de test."""
    async def _get_test_db():
        async with TestSession() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    fastapi_app.dependency_overrides[get_db] = _get_test_db
    yield
    fastapi_app.dependency_overrides.clear()


# ── Cliente HTTP ───────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def client() -> AsyncClient:
    """Cliente HTTP apuntando directamente a fastapi_app (sin Socket.IO wrapper)."""
    async with AsyncClient(
        transport=ASGITransport(app=fastapi_app),
        base_url="http://test",
    ) as c:
        yield c


# ── Usuario y token de prueba ──────────────────────────────────────────────────

USER_EMAIL    = "test@constructa.com"
USER_PASSWORD = "testpass123"
USER_NAME     = "Usuario Test"


@pytest_asyncio.fixture
async def usuario_registrado(client: AsyncClient) -> dict:
    """Registra un usuario de prueba y devuelve sus datos."""
    resp = await client.post("/api/v1/auth/register", json={
        "email": USER_EMAIL,
        "password": USER_PASSWORD,
        "full_name": USER_NAME,
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient, usuario_registrado: dict) -> dict:
    """Hace login y devuelve el header Authorization listo para usar en requests."""
    resp = await client.post("/api/v1/auth/login", json={
        "email": USER_EMAIL,
        "password": USER_PASSWORD,
    })
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def obra_base(client: AsyncClient, auth_headers: dict) -> dict:
    """Crea una obra de prueba y la devuelve. Útil para tests que necesitan una obra existente."""
    resp = await client.post("/api/v1/obras", json={"name": "Obra de Test"}, headers=auth_headers)
    assert resp.status_code == 201, resp.text
    return resp.json()
