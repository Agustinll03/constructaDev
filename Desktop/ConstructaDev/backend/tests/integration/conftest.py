import asyncio
import os

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

import app.models  # noqa: F401 — registers all models with Base.metadata
from app.core.database import Base, get_db
from app.main import fastapi_app

TEST_DB_URL = os.environ.get("TEST_DATABASE_URL", "")


@pytest.fixture(scope="session", autouse=True)
def _setup_db():
    """Create all tables before the integration test session and drop them after."""
    if not TEST_DB_URL:
        return

    async def _create():
        engine = create_async_engine(TEST_DB_URL)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await engine.dispose()

    asyncio.run(_create())
    yield
    # Tables are left in place. In CI the PostgreSQL service container is
    # ephemeral and gets discarded after the job. For local runs, point
    # TEST_DATABASE_URL at a dedicated test database, not your dev database.


@pytest_asyncio.fixture
async def client():
    if not TEST_DB_URL:
        pytest.skip("TEST_DATABASE_URL not set")

    engine = create_async_engine(TEST_DB_URL)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async def _override_get_db():
        async with Session() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    fastapi_app.dependency_overrides[get_db] = _override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=fastapi_app), base_url="http://test"
    ) as ac:
        yield ac
    fastapi_app.dependency_overrides.clear()
    await engine.dispose()
