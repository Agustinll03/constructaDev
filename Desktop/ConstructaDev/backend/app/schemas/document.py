from datetime import datetime
from pydantic import BaseModel
from app.models.document import DocumentCategory, DocumentStatus


class DocumentRead(BaseModel):
    id: int
    obra_id: int
    task_id: int | None
    uploaded_by: int
    uploader_name: str | None
    category: DocumentCategory
    status: DocumentStatus
    original_name: str
    display_name: str | None
    file_url: str
    notes: str | None
    version: int
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentUpdate(BaseModel):
    notes: str | None = None
    status: DocumentStatus | None = None
    task_id: int | None = None
