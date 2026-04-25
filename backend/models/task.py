"""models/task.py"""

import uuid, enum
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, Enum, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    BACKLOG = "backlog"


class TaskPriority(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TaskPhase(str, enum.Enum):
    SETUP = "setup"
    DESIGN = "design"
    IMPLEMENTATION = "implementation"
    TESTING = "testing"
    DOCUMENTATION = "documentation"


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)

    # From agent output (e.g., "T1")
    task_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Phase & priority
    phase: Mapped[TaskPhase | None] = mapped_column(Enum(TaskPhase), nullable=True)
    priority: Mapped[TaskPriority] = mapped_column(Enum(TaskPriority), default=TaskPriority.MEDIUM)

    # Status & progress
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), default=TaskStatus.PENDING)
    completion_pct: Mapped[int] = mapped_column(Integer, default=0)

    # Estimates
    estimated_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Dates
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Dependencies (JSON array of task IDs)
    dependencies: Mapped[list | None] = mapped_column(JSON, default=list)

    # Assignees (primary + array)
    assignee_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("members.id"), nullable=True)
    assigned_to: Mapped[list] = mapped_column(JSON, default=list)  # Array of member IDs

    # Utilization from planning agent
    percentage_utilized: Mapped[float | None] = mapped_column(default=None)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    project: Mapped["Project"] = relationship(back_populates="tasks")
    assignee: Mapped["Member | None"] = relationship(foreign_keys=[assignee_id])