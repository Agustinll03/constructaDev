"""add documents table

Revision ID: 0014
Revises: 0013
Create Date: 2026-05-21

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PGENUM

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None

_category_enum = PGENUM(
    "plano", "contrato", "certificado", "presupuesto", "foto", "otro",
    name="document_category",
    create_type=True,
)
_status_enum = PGENUM(
    "pendiente", "aprobado", "rechazado",
    name="document_status",
    create_type=True,
)


def upgrade() -> None:
    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("obra_id", sa.Integer(), sa.ForeignKey("obras.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("category", _category_enum, nullable=False),
        sa.Column("status", _status_enum, nullable=False, server_default="pendiente"),
        sa.Column("original_name", sa.String(500), nullable=False),
        sa.Column("stored_name", sa.String(500), nullable=False, unique=True),
        sa.Column("file_url", sa.String(1000), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_documents_obra_id", "documents", ["obra_id"])
    op.create_index("ix_documents_task_id", "documents", ["task_id"])


def downgrade() -> None:
    op.drop_table("documents")
    _category_enum.drop(op.get_bind(), checkfirst=True)
    _status_enum.drop(op.get_bind(), checkfirst=True)
