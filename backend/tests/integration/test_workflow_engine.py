"""tests/integration/test_workflow_engine.py

Integration tests for the full workflow pipeline.
All external dependencies (GLM, Redis) are mocked.
"""

import sys
import types

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

# Provide a lightweight redis stub so the workflow engine can be imported
# even when the optional redis package is not installed in the test runtime.
if "redis" not in sys.modules:
    redis_module = types.ModuleType("redis")
    redis_asyncio_module = types.ModuleType("redis.asyncio")
    class _RedisStub:
        pass

    redis_asyncio_module.Redis = _RedisStub
    redis_module.asyncio = redis_asyncio_module
    sys.modules["redis"] = redis_module
    sys.modules["redis.asyncio"] = redis_asyncio_module

from orchestrator.workflow_engine import WorkflowEngine
from core.exceptions import WorkflowExecutionError

# ------------------------------------------------------------------ #
#  Shared mock data                                                    #
# ------------------------------------------------------------------ #

MOCK_ANALYSIS_OUTPUT = {
    "agent": "instruction_analysis",
    "status": "success",
    "result": {
        "structured_goals": [{"goal_id": "G1", "statement": "Build a system", "priority": "high"}],
        "grading_priorities": [{"criterion": "Architecture", "weight_pct": 30, "notes": ""}],
        "ambiguities": [],
        "confidence_score": 0.88,
        "escalation_required": False,
    },
}

MOCK_PLAN_OUTPUT = {
    "agent": "planning",
    "status": "success",
    "result": {
        "tasks": [
            {"task_id": "T1", "title": "Design DB schema", "status": "pending",
             "priority": "high", "estimated_hours": 3, "dependencies": [], "milestone_id": "M1"}
        ],
        "milestones": [{"milestone_id": "M1", "title": "Design Phase", "due_date_offset_days": 5, "tasks": ["T1"]}],
        "critical_path": ["T1"],
        "total_estimated_hours": 3,
        "risk_flags": [],
        "capacity_analysis": {"total_estimated_hours": 3, "team_capacity_hours": 42, "overloaded": False},
    },
}

MOCK_COORD_OUTPUT = {
    "agent": "coordination",
    "status": "success",
    "result": {
        "role_assignments": [
            {"member_id": "m1", "member_name": "Alice", "assigned_role": "Backend Lead",
             "assigned_tasks": ["T1"], "workload_hours": 3, "reasoning": "Best fit"}
        ],
        "workload_balance": {"status": "balanced", "notes": ""},
        "meeting_agenda": [{"order": 1, "topic": "Kickoff", "duration_minutes": 15, "owner": "Alice"}],
        "accountability_pairs": [],
        "flags": [],
        "fairness_index": 1.0,
    },
}

MOCK_RISK_OUTPUT = {
    "agent": "risk_detection",
    "status": "success",
    "result": {
        "project_health": "on_track",
        "health_score": 0.85,
        "deadline_failure_probability": 0.10,
        "risks": [],
        "inactive_members": [],
        "recovery_actions": [],
        "auto_recovery_triggered": False,
        "recovery_urgency": "monitor",
        "inactivity_alert": False,
    },
}

MOCK_SUBMISSION_OUTPUT = {
    "agent": "submission_readiness",
    "status": "success",
    "result": {
        "readiness_score": 88,
        "rubric_coverage": [{"criterion": "Architecture", "weight_pct": 30, "status": "complete",
                              "evidence": "Diagram submitted", "notes": ""}],
        "missing_artefacts": [],
        "submission_checklist": [{"item": "Architecture Diagram", "status": "done", "owner": "Alice"}],
        "last_minute_risks": [],
        "recommendation": "ready_to_submit",
        "coverage_summary": {"complete": 1, "partial": 0, "missing": 0, "total": 1},
    },
}

MOCK_EMPTY_STATE = {
    "project_id": "proj-test",
    "workflow_stage": "created",
    "members": [{"id": "m1", "name": "Alice", "skills": []}],
    "structured_goals": [],
    "rubric_criteria": [],
    "ambiguities": [],
    "tasks": [],
    "milestones": [],
    "critical_path": [],
    "role_assignments": [],
    "meeting_agenda": [],
    "activity_history": [],
    "decision_history": [],
    "last_risk_report": {},
    "submission_report": {},
    "deadline_date": None,
}


# ------------------------------------------------------------------ #
#  Helpers                                                             #
# ------------------------------------------------------------------ #

def make_engine_with_mocks():
    """Return a WorkflowEngine with all external dependencies mocked."""
    engine = WorkflowEngine()

    engine.state_manager.get = AsyncMock(return_value=dict(MOCK_EMPTY_STATE))
    engine.state_manager.save = AsyncMock()
    engine.decision_logger.log = AsyncMock()
    engine.event_bus.publish = AsyncMock()
    engine.deadline_recovery.generate_recovery_plan = AsyncMock(return_value={
        "project_id": "proj-test",
        "tasks_to_cut": [],
        "tasks_to_compress": [],
        "priority_order": [],
        "recovery_message": "Recovery plan generated.",
    })

    # The workflow engine calls the module-level inactivity detector singleton,
    # so mock it here to keep the integration tests fully isolated from Redis.
    from orchestrator.workflow_engine import inactivity_detector
    inactivity_detector.scan = AsyncMock(return_value={
        "inactive_members": [],
        "active_members": ["m1"],
        "redistribution_needed": False,
    })

    engine._agents["instruction_analysis"].execute = AsyncMock(return_value=MOCK_ANALYSIS_OUTPUT)
    engine._agents["planning"].execute = AsyncMock(return_value=MOCK_PLAN_OUTPUT)
    engine._agents["coordination"].execute = AsyncMock(return_value=MOCK_COORD_OUTPUT)
    engine._agents["risk_detection"].execute = AsyncMock(return_value=MOCK_RISK_OUTPUT)
    engine._agents["submission_readiness"].execute = AsyncMock(return_value=MOCK_SUBMISSION_OUTPUT)

    return engine


# ------------------------------------------------------------------ #
#  Tests: Individual stages                                            #
# ------------------------------------------------------------------ #

@pytest.mark.asyncio
async def test_run_analysis_stores_goals():
    engine = make_engine_with_mocks()
    result = await engine.run_analysis("proj-test", "Project brief text", "brief")

    assert result["status"] == "success"
    assert result["agent"] == "instruction_analysis"

    # State should have been saved with structured_goals
    saved_state = engine.state_manager.save.call_args[0][1]
    assert len(saved_state["structured_goals"]) == 1
    assert saved_state["workflow_stage"] == "analysed"


@pytest.mark.asyncio
async def test_run_analysis_logs_decision():
    engine = make_engine_with_mocks()
    await engine.run_analysis("proj-test", "Brief text", "brief")

    engine.decision_logger.log.assert_awaited_once()
    log_call = engine.decision_logger.log.call_args
    assert log_call.kwargs["agent"] == "instruction_analysis"


@pytest.mark.asyncio
async def test_run_analysis_publishes_event():
    engine = make_engine_with_mocks()
    await engine.run_analysis("proj-test", "Brief text", "brief")

    engine.event_bus.publish.assert_awaited_once()
    event = engine.event_bus.publish.call_args[0][0]
    assert event.event_type == "analysis_complete"


@pytest.mark.asyncio
async def test_run_planning_requires_goals():
    engine = make_engine_with_mocks()
    # State has no goals
    engine.state_manager.get = AsyncMock(return_value={**MOCK_EMPTY_STATE, "structured_goals": []})

    with pytest.raises(WorkflowExecutionError, match="no structured goals"):
        await engine.run_planning("proj-test", "2025-12-01")


@pytest.mark.asyncio
async def test_run_planning_stores_tasks():
    engine = make_engine_with_mocks()
    engine.state_manager.get = AsyncMock(return_value={
        **MOCK_EMPTY_STATE,
        "structured_goals": [{"goal_id": "G1", "statement": "Build system", "priority": "high"}],
        "members": [{"id": "m1"}],
    })

    result = await engine.run_planning("proj-test", "2025-12-01")
    saved_state = engine.state_manager.save.call_args[0][1]

    assert result["status"] == "success"
    assert len(saved_state["tasks"]) == 1
    assert saved_state["workflow_stage"] == "planned"


@pytest.mark.asyncio
async def test_run_coordination_produces_assignments():
    engine = make_engine_with_mocks()
    engine.state_manager.get = AsyncMock(return_value={
        **MOCK_EMPTY_STATE,
        "tasks": MOCK_PLAN_OUTPUT["result"]["tasks"],
    })

    result = await engine.run_coordination("proj-test")
    saved_state = engine.state_manager.save.call_args[0][1]

    assert result["status"] == "success"
    assert len(saved_state["role_assignments"]) == 1
    assert saved_state["workflow_stage"] == "coordinated"


@pytest.mark.asyncio
async def test_run_risk_check_saves_report():
    engine = make_engine_with_mocks()
    result = await engine.run_risk_check("proj-test")
    saved_state = engine.state_manager.save.call_args[0][1]

    assert result["status"] == "success"
    assert saved_state["last_risk_report"]["project_health"] == "on_track"


@pytest.mark.asyncio
async def test_run_risk_check_publishes_recovery_event_when_triggered():
    engine = make_engine_with_mocks()
    critical_risk = dict(MOCK_RISK_OUTPUT)
    critical_risk["result"] = {**MOCK_RISK_OUTPUT["result"], "auto_recovery_triggered": True}
    engine._agents["risk_detection"].execute = AsyncMock(return_value=critical_risk)

    await engine.run_risk_check("proj-test")

    published_events = [call[0][0].event_type for call in engine.event_bus.publish.call_args_list]
    assert "recovery_triggered" in published_events


@pytest.mark.asyncio
async def test_run_submission_check_sets_stage():
    engine = make_engine_with_mocks()
    engine.state_manager.get = AsyncMock(return_value={
        **MOCK_EMPTY_STATE,
        "tasks": [{"title": "Report", "status": "done"}],
        "rubric_criteria": [{"criterion": "Architecture", "weight_pct": 30}],
    })

    result = await engine.run_submission_check("proj-test", ["report.pdf"])
    saved_state = engine.state_manager.save.call_args[0][1]

    assert result["status"] == "success"
    assert saved_state["workflow_stage"] == "validated"
    assert saved_state["submission_report"]["readiness_score"] == 88


# ------------------------------------------------------------------ #
#  Tests: Full pipeline                                                #
# ------------------------------------------------------------------ #

@pytest.mark.asyncio
async def test_full_pipeline_returns_all_stages():
    engine = make_engine_with_mocks()

    # After analysis, planning stage needs goals in state
    analysis_state = {**MOCK_EMPTY_STATE, "structured_goals": [{"goal_id": "G1"}], "members": [{"id": "m1"}]}
    engine.state_manager.get = AsyncMock(side_effect=[
        dict(MOCK_EMPTY_STATE),   # analysis reads
        dict(analysis_state),     # planning reads
        dict(analysis_state),     # coordination reads
        dict(analysis_state),     # risk reads
    ])

    result = await engine.run_full_pipeline(
        project_id="proj-test",
        document_text="Project brief",
        document_type="brief",
        deadline_date="2025-12-01",
    )

    assert result["pipeline_status"] == "complete"
    assert set(result["stages"].keys()) == {"analysis", "planning", "coordination", "risk"}


@pytest.mark.asyncio
async def test_full_pipeline_agent_error_raises():
    engine = make_engine_with_mocks()
    engine._agents["instruction_analysis"].execute = AsyncMock(return_value={
        "agent": "instruction_analysis",
        "status": "error",
        "error": "GLM connection timeout",
    })

    with pytest.raises(WorkflowExecutionError, match="instruction_analysis"):
        await engine.run_full_pipeline(
            project_id="proj-test",
            document_text="Brief",
            document_type="brief",
            deadline_date="2025-12-01",
        )


# ------------------------------------------------------------------ #
#  Tests: Streaming pipeline                                           #
# ------------------------------------------------------------------ #

@pytest.mark.asyncio
async def test_stream_pipeline_yields_four_stages():
    engine = make_engine_with_mocks()
    analysis_state = {**MOCK_EMPTY_STATE, "structured_goals": [{"goal_id": "G1"}], "members": [{"id": "m1"}]}
    engine.state_manager.get = AsyncMock(side_effect=[
        dict(MOCK_EMPTY_STATE),
        dict(analysis_state),
        dict(analysis_state),
        dict(analysis_state),
    ])

    stages = []
    async for chunk in engine.stream_pipeline("proj-test", "Brief", "brief", "2025-12-01"):
        stages.append(chunk["stage"])

    assert stages == ["analysis", "planning", "coordination", "risk"]