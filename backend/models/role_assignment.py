"""models/role_assignment.py — Role assignments for project members."""

import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base


class RoleType(str, enum.Enum):
    LEAD = "lead"
    COORDINATOR = "coordinator"
    CONTRIBUTOR = "contributor"
    REVIEWER = "reviewer"
    OBSERVER = "observer"


class RoleAssignment(Base):
    __tablename__ = "role_assignments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    member_id: Mapped[str] = mapped_column(String(36), ForeignKey("members.id"), nullable=False)

    role: Mapped[RoleType] = mapped_column(Enum(RoleType), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    project: Mapped["Project"] = relationship(back_populates="role_assignments")
    member: Mapped["Member"] = relationship(back_populates="role_assignments")
