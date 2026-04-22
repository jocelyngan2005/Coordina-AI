"""api/routes/agents.py — direct agent invocation for testing and advanced use."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any

from orchestrator.task_router import task_router as router_svc

router = APIRouter()


class AgentRunRequest(BaseModel):
    task_type: str
    context: dict[str, Any]


@router.post("/run")
async def run_agent(payload: AgentRunRequest):
    """
    Directly invoke any agent by task_type.
    Useful for testing individual agents without running the full pipeline.

    Valid task_types:
        analyse_document | generate_plan | coordinate_team |
        detect_risks | check_submission
    """
    try:
        return await router_svc.route(payload.task_type, payload.context)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/types")
async def list_agent_types():
    """List all available agent task types."""
    return {"available_task_types": router_svc.available_task_types()}