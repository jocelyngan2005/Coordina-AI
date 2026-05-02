"""schemas/task.py"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from models.task import TaskStatus, TaskPriority, TaskPhase


class TaskCreate(BaseModel):
    project_id: str
    title: str
    description: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    assignee_id: Optional[str] = None
    estimated_hours: int = 0
    due_date: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assignee_id: Optional[str] = None
    completion_pct: Optional[int] = None
    due_date: Optional[datetime] = None


class TaskResponse(BaseModel):
    id: str
    project_id: str
    task_id: Optional[str]
    title: str
    description: Optional[str]
    status: TaskStatus
    priority: TaskPriority
    phase: Optional[TaskPhase] = None
    assigned_to: list = []
    assignee_id: Optional[str]
    estimated_hours: int
    completion_pct: int
    start_date: Optional[datetime] = None
    due_date: Optional[datetime]
    dependencies: list = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}