from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.document import Document, DocumentCategory
from app.repositories.base import BaseRepository


class DocumentRepository(BaseRepository[Document]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Document, session)

    async def list_by_obra(self, obra_id: int) -> list[Document]:
        result = await self.session.execute(
            select(Document)
            .where(Document.obra_id == obra_id)
            .order_by(Document.category, Document.original_name, Document.version.desc())
        )
        return list(result.scalars().all())

    async def next_version(self, obra_id: int, category: DocumentCategory, original_name: str) -> int:
        result = await self.session.execute(
            select(func.max(Document.version)).where(
                Document.obra_id == obra_id,
                Document.category == category,
                Document.original_name == original_name,
            )
        )
        max_v = result.scalar()
        return (max_v or 0) + 1
