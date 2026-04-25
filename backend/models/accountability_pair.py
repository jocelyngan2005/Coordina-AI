"""models/accountability_pair.py — Accountability partnerships."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base


class AccountabilityPair(Base):
    __tablename__ = "accountability_pairs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    member_1_id: Mapped[str] = mapped_column(String(36), ForeignKey("members.id"), nullable=False)
    member_2_id: Mapped[str] = mapped_column(String(36), ForeignKey("members.id"), nullable=False)

    objectives: Mapped[str | None] = mapped_column(Text, nullable=True)
    check_in_frequency: Mapped[str] = mapped_column(String(50), default="weekly")  # weekly, biweekly, monthly

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    project: Mapped["Project"] = relationship(back_populates="accountability_pairs")
