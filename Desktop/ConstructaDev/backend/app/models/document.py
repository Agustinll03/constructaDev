import enum
from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ENUM as PGENUM
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class DocumentCategory(str, enum.Enum):
    PLANO = "plano"
    CONTRATO = "contrato"
    CERTIFICADO = "certificado"
    PRESUPUESTO = "presupuesto"
    FOTO = "foto"
    OTRO = "otro"


class DocumentStatus(str, enum.Enum):
    PENDIENTE = "pendiente"
    APROBADO = "aprobado"
    RECHAZADO = "rechazado"


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    obra_id: Mapped[int] = mapped_column(
        ForeignKey("obras.id", ondelete="CASCADE"), nullable=False, index=True
    )
    task_id: Mapped[int | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True
    )
    uploaded_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )

    # create_type=False: the type is created/dropped by Alembic migrations only
    category: Mapped[DocumentCategory] = mapped_column(
        PGENUM(
            "plano", "contrato", "certificado", "presupuesto", "foto", "otro",
            name="document_category",
            create_type=False,
        ),
        nullable=False,
    )
    status: Mapped[DocumentStatus] = mapped_column(
        PGENUM(
            "pendiente", "aprobado", "rechazado",
            name="document_status",
            create_type=False,
        ),
        default=DocumentStatus.PENDIENTE,
        nullable=False,
    )

    original_name: Mapped[str] = mapped_column(String(500), nullable=False)
    stored_name: Mapped[str] = mapped_column(String(500), nullable=False, unique=True)
    file_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    obra: Mapped["Obra"] = relationship("Obra", back_populates="documents")
    task: Mapped["Task | None"] = relationship("Task", back_populates="documents")
    uploader: Mapped["User"] = relationship("User")
