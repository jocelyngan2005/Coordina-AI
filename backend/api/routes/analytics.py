"""api/routes/analytics.py"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from core.database import get_db
from memory.activity_tracker import activity_tracker
from models.task import Task, TaskStatus
from orchestrator.state_manager import StateManager

router = APIRouter()
state_manager = StateManager()


@router.get("/project/{project_id}/overview")
async def project_overview(project_id: str, db: AsyncSession = Depends(get_db)):
    """Returns task completion stats, contribution counts, and risk summary."""

    # Task stats
    result = await db.execute(
        select(Task.status, func.count(Task.id))
        .where(Task.project_id == project_id)
        .group_by(Task.status)
    )
    task_stats = {row[0]: row[1] for row in result.fetchall()}

    total = sum(task_stats.values())
    done = task_stats.get(TaskStatus.DONE, 0)
    completion_pct = round((done / total * 100) if total else 0, 1)

    # Contribution counts from Redis
    contribution_counts = await activity_tracker.get_contribution_counts(project_id)

    # Last risk report from state
    state = await state_manager.get(project_id)
    risk_report = state.get("last_risk_report", {})

    return {
        "project_id": project_id,
        "task_stats": task_stats,
        "total_tasks": total,
        "completion_pct": completion_pct,
        "contribution_counts": contribution_counts,
        "project_health": risk_report.get("project_health", "unknown"),
        "health_score": risk_report.get("health_score"),
        "deadline_failure_probability": risk_report.get("deadline_failure_probability"),
        "workflow_stage": state.get("workflow_stage"),
        "submission_readiness": state.get("submission_report", {}).get("readiness_score"),
    }


@router.get("/project/{project_id}/contributions")
async def contribution_breakdown(project_id: str):
    """Per-member contribution event history."""
    history = await activity_tracker.get_history(project_id, limit=200)
    counts = await activity_tracker.get_contribution_counts(project_id)
    return {
        "project_id": project_id,
        "counts_by_member": counts,
        "recent_events": history[-20:],
    }