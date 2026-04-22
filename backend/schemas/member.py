"""schemas/member.py"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class MemberCreate(BaseModel):
    project_id: str
    name: str
    email: Optional[str] = None
    skills: list[str] = []


class MemberUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    skills: Optional[list[str]] = None
    contribution_score: Optional[float] = None


class MemberResponse(BaseModel):
    id: str
    project_id: str
    name: str
    email: Optional[str]
    skills: list[str]
    contribution_score: float
    last_activity_at: Optional[datetime]
    joined_at: datetime

    model_config = {"from_attributes": True}