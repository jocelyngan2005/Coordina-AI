"""models/rubric.py — Grading criteria from instruction_analysis_agent."""

import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, Enum, Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base


class CriterionStatus(str, enum.Enum):
    COVERED = "covered"
    PARTIAL = "partial"
    MISSING = "missing"


class GradingCriterion(Base):
    __tablename__ = "grading_criteria"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)

    # From agent output (e.g., "C1")
    criterion_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    criterion_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Scoring
    max_score: Mapped[int] = mapped_column(Integer, default=100)
    weight: Mapped[float] = mapped_column(Float, default=0.0)  # 0.25 = 25%

    # Current progress
    score: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[CriterionStatus] = mapped_column(Enum(CriterionStatus), default=CriterionStatus.MISSING)
    evidence: Mapped[str | None] = mapped_column(Text, nullable=True)  # Comma-separated items
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    project: Mapped["Project"] = relationship(back_populates="grading_criteria")
