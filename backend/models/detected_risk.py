"""models/detected_risk.py — Detected project risks."""

import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, ForeignKey, Enum, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base


class RiskLevel(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class DetectedRisk(Base):
    __tablename__ = "detected_risks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    risk_level: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel), default=RiskLevel.MEDIUM)
    probability: Mapped[float] = mapped_column(Float, default=0.5)  # 0.0 to 1.0
    impact: Mapped[float] = mapped_column(Float, default=0.5)  # 0.0 to 1.0
    mitigation_plan: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_resolved: Mapped[bool] = mapped_column(default=False)

    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    project: Mapped["Project"] = relationship(back_populates="detected_risks")
