import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.core.deps import CurrentUser, CurrentUserId, DbSession
from app.models.document import Document, DocumentCategory
from app.repositories.document import DocumentRepository
from app.schemas.document import DocumentRead, DocumentUpdate

UPLOADS_DIR = Path(__file__).parent.parent.parent.parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

BACKEND_URL = "http://localhost:8000"

ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png", "webp", "dwg", "dxf", "xlsx", "docx"}
MAX_BYTES = 20 * 1024 * 1024  # 20 MB

router = APIRouter(prefix="/documents", tags=["documents"])


def _to_read(doc: Document) -> DocumentRead:
    uploader_name = None
    if doc.uploader:
        uploader_name = doc.uploader.full_name or doc.uploader.email
    return DocumentRead(
        id=doc.id,
        obra_id=doc.obra_id,
        task_id=doc.task_id,
        uploaded_by=doc.uploaded_by,
        uploader_name=uploader_name,
        category=doc.category,
        status=doc.status,
        original_name=doc.original_name,
        display_name=doc.display_name,
        file_url=doc.file_url,
        notes=doc.notes,
        version=doc.version,
        created_at=doc.created_at,
    )


@router.post("/upload", status_code=status.HTTP_201_CREATED, response_model=DocumentRead)
async def upload_document(
    db: DbSession,
    current_user: CurrentUser,
    obra_id: int = Form(...),
    category: DocumentCategory = Form(...),
    task_id: int | None = Form(None),
    notes: str | None = Form(None),
    original_name: str | None = Form(None),
    file: UploadFile = File(...),
) -> DocumentRead:
    actual_name = file.filename or "documento"
    raw_name = original_name or actual_name
    ext = raw_name.rsplit(".", 1)[-1].lower() if "." in raw_name else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Extensión no permitida: .{ext}")

    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(400, "El archivo no puede superar 20 MB.")

    stored_name = f"{uuid.uuid4().hex}.{ext}"
    (UPLOADS_DIR / stored_name).write_bytes(content)
    file_url = f"{BACKEND_URL}/uploads/{stored_name}"

    repo = DocumentRepository(db)
    version = await repo.next_version(obra_id, category, raw_name)

    doc = Document(
        obra_id=obra_id,
        task_id=task_id,
        uploaded_by=current_user.id,
        category=category,
        original_name=raw_name,
        display_name=actual_name,
        stored_name=stored_name,
        file_url=file_url,
        notes=notes,
        version=version,
    )
    saved = await repo.create(doc)
    await db.refresh(saved, ["uploader"])
    return _to_read(saved)


@router.get("/obra/{obra_id}", response_model=list[DocumentRead])
async def list_documents(
    obra_id: int,
    db: DbSession,
    _user_id: CurrentUserId,
) -> list[DocumentRead]:
    repo = DocumentRepository(db)
    docs = await repo.list_by_obra(obra_id)
    result = []
    for doc in docs:
        await db.refresh(doc, ["uploader"])
        result.append(_to_read(doc))
    return result


@router.patch("/{doc_id}", response_model=DocumentRead)
async def update_document(
    doc_id: int,
    data: DocumentUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> DocumentRead:
    repo = DocumentRepository(db)
    doc = await repo.get(doc_id)
    if not doc:
        raise HTTPException(404, "Documento no encontrado.")

    fields = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None or k == "notes"}
    if fields:
        doc = await repo.update_fields(doc_id, **fields)

    await db.refresh(doc, ["uploader"])
    return _to_read(doc)


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> None:
    repo = DocumentRepository(db)
    doc = await repo.get(doc_id)
    if not doc:
        raise HTTPException(404, "Documento no encontrado.")

    stored = UPLOADS_DIR / doc.stored_name
    if stored.is_file():
        stored.unlink(missing_ok=True)

    await repo.delete(doc_id)
