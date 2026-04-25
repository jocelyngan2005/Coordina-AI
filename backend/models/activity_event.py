"""models/activity_event.py — Project activity events."""

import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base


class ActivityType(str, enum.Enum):
    TASK_CREATED = "task_created"
    TASK_COMPLETED = "task_completed"
    COMMENT_ADDED = "comment_added"
    MEMBER_JOINED = "member_joined"
    MEMBER_LEFT = "member_left"
    STATUS_CHANGED = "status_changed"
    DOCUMENT_UPLOADED = "document_uploaded"
    OTHER = "other"


class ActivityEvent(Base):
    __tablename__ = "activity_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)

    activity_type: Mapped[ActivityType] = mapped_column(Enum(ActivityType), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    actor_id: Mapped[str | None] = mapped_column(String(36), nullable=True)  # Member who triggered this
    target_id: Mapped[str | None] = mapped_column(String(36), nullable=True)  # Task, Document, etc.

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    project: Mapped["Project"] = relationship(back_populates="activity_events")
