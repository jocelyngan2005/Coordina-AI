"""api/routes/tasks.py"""

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from core.exceptions import not_found
from memory.activity_tracker import activity_tracker
from orchestrator.state_manager import StateManager
from core.logger import logger
from models.task import Task, TaskPhase, TaskPriority, TaskStatus
from schemas.task import TaskCreate, TaskResponse, TaskUpdate

router = APIRouter()
state_manager = StateManager()


def _parse_dt(value: object) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return None


def _coerce_status(raw: object) -> TaskStatus:
    try:
        return TaskStatus(str(raw))
    except ValueError:
        return TaskStatus.PENDING


def _coerce_priority(raw: object) -> TaskPriority:
    try:
        return TaskPriority(str(raw))
    except ValueError:
        return TaskPriority.MEDIUM


def _coerce_phase(raw: object) -> TaskPhase | None:
    if not raw:
        return None
    try:
        return TaskPhase(str(raw))
    except ValueError:
        return None


async def _get_task_by_id_or_task_id(task_id: str, db: AsyncSession) -> Task | None:
    task = await db.get(Task, task_id)
    if task:
        return task

    result = await db.execute(select(Task).where(Task.task_id == task_id))
    return result.scalar_one_or_none()


@router.post("/", response_model=TaskResponse, status_code=201)
async def create_task(payload: TaskCreate, db: AsyncSession = Depends(get_db)):
    task = Task(**payload.model_dump())
    db.add(task)
    await db.flush()
    await db.refresh(task)
    return task


@router.get("/project/{project_id}", response_model=list[TaskResponse])
async def list_tasks(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Task).where(Task.project_id == project_id).order_by(Task.created_at)
    )
    tasks = result.scalars().all()
    if tasks:
        return tasks

    # No DB tasks yet — hydrate from workflow state if available.
    try:
        state = await state_manager.get(project_id)
    except Exception as exc:
        logger.warning("[tasks] Could not load workflow state for %s: %s", project_id, exc)
        return tasks

    glm_tasks = state.get("tasks") or []
    if not glm_tasks:
        return tasks

    existing = await db.execute(select(Task).where(Task.project_id == project_id))
    existing_by_task_key = {
        task.task_id or task.id: task
        for task in existing.scalars().all()
    }

    for index, raw in enumerate(glm_tasks):
        if not isinstance(raw, dict):
            continue

        task_key = str(raw.get("task_id") or raw.get("id") or f"t{index + 1}").strip()
        existing_task = existing_by_task_key.get(task_key)

        assigned_to_raw = raw.get("assigned_to")
        if isinstance(assigned_to_raw, list):
            assigned_list = [str(item) for item in assigned_to_raw if item]
        elif assigned_to_raw:
            assigned_list = [str(assigned_to_raw)]
        else:
            assigned_list = []

        payload = {
            "project_id": project_id,
            "task_id": task_key,
            "title": str(raw.get("title") or "Untitled task"),
            "description": raw.get("description"),
            "status": _coerce_status(raw.get("status")),
            "priority": _coerce_priority(raw.get("priority")),
            "phase": _coerce_phase(raw.get("phase")),
            "estimated_hours": int(raw.get("estimated_hours") or 0),
            "completion_pct": int(raw.get("completion_pct") or 0),
            "start_date": _parse_dt(raw.get("startDate") or raw.get("start_date")),
            "due_date": _parse_dt(raw.get("endDate") or raw.get("end_date") or raw.get("due_date")),
            "dependencies": raw.get("dependencies") or [],
            "assigned_to": assigned_list,
            # Don't set assignee_id during hydration — avoid FK constraint violation on GLM member IDs.
            # Real member mappings happen separately when members are synced to DB.
            "assignee_id": None,
            "percentage_utilized": raw.get("percentage_utilized"),
        }

        if existing_task:
            for field, value in payload.items():
                setattr(existing_task, field, value)
        else:
            db.add(Task(**payload))

    await db.flush()
    result = await db.execute(
        select(Task).where(Task.project_id == project_id).order_by(Task.created_at)
    )
    return result.scalars().all()


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, db: AsyncSession = Depends(get_db)):
    task = await _get_task_by_id_or_task_id(task_id, db)
    if not task:
        raise not_found(f"Task '{task_id}' not found.")
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    db: AsyncSession = Depends(get_db),
):
    task = await _get_task_by_id_or_task_id(task_id, db)
    if not task:
        raise not_found(f"Task '{task_id}' not found.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, field, value)

    await db.flush()
    await db.refresh(task)

    # Record activity event if assignee updated the task
    if payload.assignee_id and payload.completion_pct is not None:
        await activity_tracker.record(
            project_id=task.project_id,
            member_id=payload.assignee_id,
            activity_type="task_updated",
            metadata={"task_id": task_id, "completion_pct": payload.completion_pct},
        )

    return task


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: str, db: AsyncSession = Depends(get_db)):
    task = await _get_task_by_id_or_task_id(task_id, db)
    if not task:
        raise not_found(f"Task '{task_id}' not found.")
    await db.delete(task)