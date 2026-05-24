import os

# Must be set before any app imports so Pydantic Settings doesn't raise
# ValidationError when DATABASE_URL and SECRET_KEY are not in the environment.
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-unit-tests-only")
