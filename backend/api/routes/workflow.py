"""
api/routes/workflow.py

Exposes the full workflow orchestration pipeline and individual stage endpoints.
This is the primary integration point between frontend and the GLM engine.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import json

from core.database import get_db
from core.exceptions import WorkflowExecutionError, not_found
from orchestrator.workflow_engine import workflow_engine
from orchestrator.state_manager import StateManager
from memory.decision_log import DecisionLogger
from schemas.workflow import (
    RunAnalysisRequest,
    RunPlanningRequest,
    RunFullPipelineRequest,
    RunSubmissionCheckRequest,
    WorkflowStateResponse,
)

router = APIRouter()
state_manager = StateManager()
decision_logger = DecisionLogger()


@router.post("/{project_id}/analyse")
async def run_analysis(
    project_id: str,
    payload: RunAnalysisRequest,
    db: AsyncSession = Depends(get_db),
):
    """Stage 2: Analyse project brief/rubric and extract structured goals."""
    try:
        result = await workflow_engine.run_analysis(
            project_id=project_id,
            document_text=payload.document_text,
            document_type=payload.document_type,
        )
        return result
    except WorkflowExecutionError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/{project_id}/plan")
async def run_planning(
    project_id: str,
    payload: RunPlanningRequest,
    db: AsyncSession = Depends(get_db),
):
    """Stage 3: Decompose goals into tasks and milestones."""
    try:
        result = await workflow_engine.run_planning(
            project_id=project_id,
            deadline_date=payload.deadline_date,
        )
        return result
    except WorkflowExecutionError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/{project_id}/coordinate")
async def run_coordination(project_id: str, db: AsyncSession = Depends(get_db)):
    """Stage 4: Assign roles and generate meeting agenda."""
    try:
        return await workflow_engine.run_coordination(project_id=project_id)
    except WorkflowExecutionError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/{project_id}/risk-check")
async def run_risk_check(project_id: str, db: AsyncSession = Depends(get_db)):
    """Stage 5: Detect risks and trigger recovery if needed."""
    try:
        return await workflow_engine.run_risk_check(project_id=project_id)
    except WorkflowExecutionError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/{project_id}/submission-check")
async def run_submission_check(
    project_id: str,
    payload: RunSubmissionCheckRequest,
    db: AsyncSession = Depends(get_db),
):
    """Stage 6: Validate rubric coverage and generate readiness score."""
    try:
        return await workflow_engine.run_submission_check(
            project_id=project_id,
            uploaded_artefacts=payload.uploaded_artefacts,
        )
    except WorkflowExecutionError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/{project_id}/run-pipeline")
async def run_full_pipeline(
    project_id: str,
    payload: RunFullPipelineRequest,
    db: AsyncSession = Depends(get_db),
):
    """Run all workflow stages in sequence (stages 2–5)."""
    try:
        return await workflow_engine.run_full_pipeline(
            project_id=project_id,
            document_text=payload.document_text,
            document_type=payload.document_type,
            deadline_date=payload.deadline_date,
        )
    except WorkflowExecutionError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/{project_id}/state", response_model=WorkflowStateResponse)
async def get_workflow_state(project_id: str):
    """Return current project state from Redis."""
    state = await state_manager.get(project_id)
    return state


@router.get("/{project_id}/decisions")
async def get_decision_log(project_id: str, limit: int = 20):
    """Return GLM decision history for auditability."""
    return await decision_logger.get_recent(project_id, n=limit)


@router.get("/{project_id}/stream-pipeline")
async def stream_pipeline(
    project_id: str,
    document_text: str,
    document_type: str,
    deadline_date: str,
):
    """
    SSE endpoint: streams pipeline stage results as they complete.
    Frontend can render each stage progressively.
    """
    async def event_generator():
        async for stage_result in workflow_engine.stream_pipeline(
            project_id=project_id,
            document_text=document_text,
            document_type=document_type,
            deadline_date=deadline_date,
        ):
            yield f"data: {json.dumps(stage_result)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")