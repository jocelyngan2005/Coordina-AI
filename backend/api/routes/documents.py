"""api/routes/documents.py"""

from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from core.exceptions import not_found
from parsers.document_parser import DocumentParser
from models.document import Document
from schemas.document import DocumentResponse

router = APIRouter()
parser = DocumentParser()


@router.post("/{project_id}/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    project_id: str,
    file: UploadFile = File(...),
    document_type: str = "brief",
    db: AsyncSession = Depends(get_db),
):
    """Upload a project brief, rubric, or other document."""
    content = await file.read()
    mime_type = file.content_type or "application/octet-stream"
    
    # Extract text from file
    extracted_text = parser.extract(content, mime_type)
    
    # Store document in DB
    document = Document(
        project_id=project_id,
        file_name=file.filename or "unnamed",
        document_type=document_type,
        mime_type=mime_type,
        content=content,
        extracted_text=extracted_text[:5000],  # Store first 5000 chars for indexing
    )
    db.add(document)
    await db.flush()
    await db.refresh(document)
    return document


@router.get("/project/{project_id}", response_model=list[DocumentResponse])
async def list_documents(project_id: str, db: AsyncSession = Depends(get_db)):
    """List all documents for a project."""
    result = await db.execute(
        select(Document).where(Document.project_id == project_id).order_by(Document.uploaded_at.desc())
    )
    return result.scalars().all()


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: str, db: AsyncSession = Depends(get_db)):
    """Get a document by ID."""
    document = await db.get(Document, document_id)
    if not document:
        raise not_found(f"Document '{document_id}' not found.")
    return document


@router.delete("/{document_id}", status_code=204)
async def delete_document(document_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a document."""
    document = await db.get(Document, document_id)
    if not document:
        raise not_found(f"Document '{document_id}' not found.")
    await db.delete(document)