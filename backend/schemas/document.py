"""schemas/document.py"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class DocumentCreate(BaseModel):
    project_id: str
    file_name: str
    document_type: str  # "brief" | "rubric" | "meeting_transcript" | "chat_logs"
    mime_type: str


class DocumentResponse(BaseModel):
    id: str
    project_id: str
    file_name: str
    document_type: str
    mime_type: str
    extracted_text: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True


class DocumentUpdate(BaseModel):
    document_type: Optional[str] = None
    file_name: Optional[str] = None
