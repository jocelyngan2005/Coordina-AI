"""models/project.py"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, Enum, Date, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base
import enum


class ProjectStatus(str, enum.Enum):
    CREATED = "created"
    ANALYSED = "analysed"
    PLANNED = "planned"
    ACTIVE = "active"
    AT_RISK = "at_risk"
    SUBMITTED = "submitted"
    COMPLETED = "completed"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus), default=ProjectStatus.CREATED
    )

    # Dates
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deadline_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Workflow & team metadata
    workflow_stage: Mapped[str] = mapped_column(String(50), default="created")  # created, analysed, planned, coordinated, monitoring, validated
    team_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)  # From instruction_analysis

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    
    @property
    def calculated_team_size(self) -> int:
        """Returns the stored team_size or the count of currently joined members."""
        if self.team_size is not None:
            return self.team_size
        return len(self.members)

    # Relationships
    members: Mapped[list["Member"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    tasks: Mapped[list["Task"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    documents: Mapped[list["Document"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    decision_logs: Mapped[list["DecisionLog"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    workflow_events: Mapped[list["WorkflowEvent"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    structured_goals: Mapped[list["StructuredGoal"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    grading_criteria: Mapped[list["GradingCriterion"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    milestones: Mapped[list["Milestone"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    role_assignments: Mapped[list["RoleAssignment"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    contribution_balance: Mapped[list["ContributionBalance"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    meeting_agendas: Mapped[list["MeetingAgenda"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    accountability_pairs: Mapped[list["AccountabilityPair"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    activity_events: Mapped[list["ActivityEvent"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    detected_risks: Mapped[list["DetectedRisk"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    risk_reports: Mapped[list["RiskReport"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    submission_checklists: Mapped[list["SubmissionChecklist"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    submission_reports: Mapped[list["SubmissionReport"]] = relationship(back_populates="project", cascade="all, delete-orphan")