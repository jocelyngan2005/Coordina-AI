"""models/contribution_balance.py — Team contribution balance tracking."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base


class ContributionBalance(Base):
    __tablename__ = "contribution_balance"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    member_id: Mapped[str] = mapped_column(String(36), ForeignKey("members.id"), nullable=False)

    contribution_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    expected_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    balance_score: Mapped[float] = mapped_column(Float, default=0.0)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    project: Mapped["Project"] = relationship(back_populates="contribution_balance")
