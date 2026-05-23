"""add display_name to documents

Revision ID: 0015
Revises: 0014
Create Date: 2026-05-21

"""
from alembic import op
import sqlalchemy as sa

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("display_name", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("documents", "display_name")
