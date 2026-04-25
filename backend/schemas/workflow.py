"""schemas/workflow.py"""

from pydantic import BaseModel
from typing import Any, Optional


class RunAnalysisRequest(BaseModel):
    document_text: str
    document_type: str = "brief"  # "brief" | "rubric" | "meeting_transcript" | "chat_logs"


class RunPlanningRequest(BaseModel):
    deadline_date: str  # ISO date: "2025-12-01"


class RunFullPipelineRequest(BaseModel):
    document_text: str
    document_type: str = "brief"  # "brief" | "rubric" | "meeting_transcript" | "chat_logs"
    deadline_date: str
    project_name: Optional[str] = None  # e.g., "Smart Campus Navigation System"
    team_size: Optional[int] = None  # Number of team members
    team_members: Optional[list[dict[str, Any]]] = None  # [{"name": "...", "skills": ["..."]}, ...]


class RunSubmissionCheckRequest(BaseModel):
    uploaded_artefacts: list[str] = []


class WorkflowStateResponse(BaseModel):
    project_id: str
    workflow_stage: str
    structured_goals: list[Any] = []
    tasks: list[Any] = []
    milestones: list[Any] = []
    members: list[Any] = []
    role_assignments: list[Any] = []
    last_risk_report: dict[str, Any] = {}
    submission_report: dict[str, Any] = {}
    deadline_date: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = {"from_attributes": False}