"""models/document.py"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, LargeBinary, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    document_type: Mapped[str] = mapped_column(String(50), default="brief")  # brief | rubric | transcript | submission
    mime_type: Mapped[str] = mapped_column(String(100), default="text/plain")
    content: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)  # Raw file bytes
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    project: Mapped["Project"] = relationship(back_populates="documents")