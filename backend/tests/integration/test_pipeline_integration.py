"""
tests/integration/test_pipeline_integration.py

Integration tests corresponding to QATD Section 5.
Tests the full workflow pipeline end-to-end with real FastAPI routes,
mocked GLM, and in-memory DB/Redis overrides.

Covers: TC-01, TC-02, TC-03, TC-08, TC-09, TC-10, TC-11, TC-12, TC-13
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport

from main import app
from core.database import get_db

# ── Mock DB ──────────────────────────────────────────────────────────

class MockDB:
    def __init__(self): self._store = {}
    async def get(self, model, id): return self._store.get(id)
    def add(self, obj):
        key = getattr(obj, "id", "mock")
        self._store[key] = obj
    async def flush(self): pass
    async def refresh(self, obj): pass
    async def delete(self, obj): pass
    async def execute(self, stmt):
        r = MagicMock()
        r.scalars.return_value.all.return_value = []
        r.fetchall.return_value = []
        return r
    async def commit(self): pass
    async def rollback(self): pass

async def override_get_db():
    yield MockDB()

app.dependency_overrides[get_db] = override_get_db

# ── Mock pipeline outputs ─────────────────────────────────────────────

MOCK_ANALYSIS = {
    "agent": "instruction_analysis", "status": "success",
    "result": {
        "structured_goals": [
            {"goal_id": "G1", "statement": "Build prototype", "priority": "high"},
            {"goal_id": "G2", "statement": "Write report",    "priority": "medium"},
        ],
        "grading_priorities": [{"criterion": "Architecture", "weight_pct": 30, "notes": ""}],
        "ambiguities": [],
        "confidence_score": 0.88,
        "escalation_required": False,
    },
}

MOCK_PLAN = {
    "agent": "planning", "status": "success",
    "result": {
        "tasks": [
            {"task_id": "T1", "title": "DB schema", "status": "pending",
             "priority": "critical", "estimated_hours": 3, "dependencies": [], "milestone_id": "M1"},
            {"task_id": "T2", "title": "API build",  "status": "pending",
             "priority": "high",     "estimated_hours": 5, "dependencies": ["T1"], "milestone_id": "M1"},
        ],
        "milestones": [{"milestone_id": "M1", "title": "Phase 1", "due_date_offset_days": 7, "tasks": ["T1","T2"]}],
        "critical_path": ["T1", "T2"],
        "total_estimated_hours": 8,
        "risk_flags": [],
        "capacity_analysis": {"total_estimated_hours": 8, "team_capacity_hours": 84, "overloaded": False},
    },
}

MOCK_COORD = {
    "agent": "coordination", "status": "success",
    "result": {
        "role_assignments": [
            {"member_id": "m1", "member_name": "Alice", "assigned_role": "Backend Lead",
             "assigned_tasks": ["T1","T2"], "workload_hours": 8, "reasoning": "Best fit"},
        ],
        "workload_balance": {"status": "balanced", "notes": ""},
        "meeting_agenda": [{"order": 1, "topic": "Kickoff", "duration_minutes": 15, "owner": "Alice"}],
        "accountability_pairs": [],
        "flags": [],
        "fairness_index": 1.0,
    },
}

MOCK_RISK = {
    "agent": "risk_detection", "status": "success",
    "result": {
        "project_health": "on_track", "health_score": 0.85,
        "deadline_failure_probability": 0.10,
        "risks": [], "inactive_members": [], "recovery_actions": [],
        "auto_recovery_triggered": False, "recovery_urgency": "monitor", "inactivity_alert": False,
    },
}

MOCK_STATE = {
    "project_id": "test-proj", "workflow_stage": "planned",
    "structured_goals": [{"goal_id": "G1", "statement": "Build", "priority": "high"}],
    "tasks": [{"task_id": "T1", "title": "DB schema", "status": "pending"}],
    "members": [{"id": "m1", "name": "Alice"}],
    "milestones": [], "critical_path": [], "role_assignments": [],
    "activity_history": [], "decision_history": [], "rubric_criteria": [],
    "last_risk_report": {}, "submission_report": {},
    "deadline_date": "2025-12-01", "updated_at": "2025-11-01T00:00:00Z",
}


# ── Fixtures ──────────────────────────────────────────────────────────

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


# ── TC-01: Happy case — full pipeline ────────────────────────────────

@pytest.mark.asyncio
async def test_TC01_full_pipeline_happy_case(client):
    """TC-01: Full pipeline returns all 4 stage results with pipeline_status=complete."""
    from orchestrator.workflow_engine import workflow_engine

    state_sequence = [
        dict(MOCK_STATE),
        {**MOCK_STATE, "structured_goals": [{"goal_id": "G1"}], "members": [{"id": "m1"}]},
        dict(MOCK_STATE),
        dict(MOCK_STATE),
    ]

    with patch.object(workflow_engine.state_manager, "get", new=AsyncMock(side_effect=state_sequence)), \
         patch.object(workflow_engine.state_manager, "save", new=AsyncMock()), \
         patch.object(workflow_engine.decision_logger, "log", new=AsyncMock()), \
         patch.object(workflow_engine.event_bus, "publish", new=AsyncMock()), \
         patch.object(workflow_engine._agents["instruction_analysis"], "execute", new=AsyncMock(return_value=MOCK_ANALYSIS)), \
         patch.object(workflow_engine._agents["planning"], "execute", new=AsyncMock(return_value=MOCK_PLAN)), \
         patch.object(workflow_engine._agents["coordination"], "execute", new=AsyncMock(return_value=MOCK_COORD)), \
         patch.object(workflow_engine._agents["risk_detection"], "execute", new=AsyncMock(return_value=MOCK_RISK)):

        response = await client.post(
            "/api/workflow/test-proj/run-pipeline",
            json={
                "document_text": "Build a full-stack web app with AI integration.",
                "document_type": "brief",
                "deadline_date": "2025-12-01",
            }
        )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert data["pipeline_status"] == "complete"
    assert set(data["stages"].keys()) == {"analysis", "planning", "coordination", "risk"}
    for stage_name, stage_data in data["stages"].items():
        assert stage_data["status"] == "success", f"Stage {stage_name} failed: {stage_data}"


# ── TC-02: Negative — unsupported file type upload ────────────────────

@pytest.mark.asyncio
async def test_TC02_unsupported_file_type_returns_415(client):
    """TC-02: Uploading a .exe file returns 415 with clear error message."""
    import io
    response = await client.post(
        "/api/documents/upload/test-proj",
        data={"doc_type": "brief", "run_analysis": "false"},
        files={"file": ("malware.exe", io.BytesIO(b"MZ fake exe content"), "application/octet-stream")},
    )
    assert response.status_code == 415
    data = response.json()
    assert "detail" in data
    assert "Unsupported" in data["detail"] or "unsupported" in data["detail"].lower()


# ── TC-03: Negative — plan without analysis ───────────────────────────

@pytest.mark.asyncio
async def test_TC03_plan_without_analysis_returns_422(client):
    """TC-03: Calling /plan on a project with no goals returns 422 + clear message."""
    from orchestrator.workflow_engine import workflow_engine
    empty_state = {**MOCK_STATE, "structured_goals": []}

    with patch.object(workflow_engine.state_manager, "get", new=AsyncMock(return_value=empty_state)):
        response = await client.post(
            "/api/workflow/test-proj/plan",
            json={"deadline_date": "2025-12-01"}
        )

    assert response.status_code == 422
    detail = response.json().get("detail", "")
    assert "no structured goals" in detail.lower() or "analysis" in detail.lower()


# ── TC-08: State persists across stages ───────────────────────────────

@pytest.mark.asyncio
async def test_TC08_state_persists_across_pipeline_stages(client):
    """TC-08: Verify state is read and written at each pipeline stage."""
    from orchestrator.workflow_engine import workflow_engine
    save_calls = []

    async def capture_save(project_id, state):
        save_calls.append({"project_id": project_id, "stage": state.get("workflow_stage")})

    state_seq = [
        dict(MOCK_STATE),
        {**MOCK_STATE, "structured_goals": [{"goal_id": "G1"}], "members": [{"id": "m1"}]},
        dict(MOCK_STATE),
        dict(MOCK_STATE),
    ]

    with patch.object(workflow_engine.state_manager, "get", new=AsyncMock(side_effect=state_seq)), \
         patch.object(workflow_engine.state_manager, "save", new=capture_save), \
         patch.object(workflow_engine.decision_logger, "log", new=AsyncMock()), \
         patch.object(workflow_engine.event_bus, "publish", new=AsyncMock()), \
         patch.object(workflow_engine._agents["instruction_analysis"], "execute", new=AsyncMock(return_value=MOCK_ANALYSIS)), \
         patch.object(workflow_engine._agents["planning"], "execute", new=AsyncMock(return_value=MOCK_PLAN)), \
         patch.object(workflow_engine._agents["coordination"], "execute", new=AsyncMock(return_value=MOCK_COORD)), \
         patch.object(workflow_engine._agents["risk_detection"], "execute", new=AsyncMock(return_value=MOCK_RISK)):

        await client.post(
            "/api/workflow/test-proj/run-pipeline",
            json={"document_text": "Brief text", "document_type": "brief", "deadline_date": "2025-12-01"}
        )

    # State should have been saved at least 4 times (once per stage)
    assert len(save_calls) >= 4, f"Expected >= 4 saves, got {len(save_calls)}"
    saved_stages = [c["stage"] for c in save_calls]
    assert "analysed" in saved_stages
    assert "planned" in saved_stages
    assert "coordinated" in saved_stages


# ── TC-09: Edge — ambiguous brief triggers escalation ────────────────

@pytest.mark.asyncio
async def test_TC09_vague_brief_triggers_escalation(client):
    """TC-09: Vague brief returns escalation_required=True in analysis response."""
    from orchestrator.workflow_engine import workflow_engine
    escalation_result = {
        "agent": "instruction_analysis", "status": "success",
        "result": {
            "structured_goals": [],
            "grading_priorities": [],
            "ambiguities": [{"issue": "No deliverables specified", "suggested_clarification": "What should be built?"}],
            "confidence_score": 0.35,
            "escalation_required": True,
            "escalation_reason": "Low confidence. Manual review recommended.",
        },
    }

    with patch.object(workflow_engine.state_manager, "get", new=AsyncMock(return_value=dict(MOCK_STATE))), \
         patch.object(workflow_engine.state_manager, "save", new=AsyncMock()), \
         patch.object(workflow_engine.decision_logger, "log", new=AsyncMock()), \
         patch.object(workflow_engine.event_bus, "publish", new=AsyncMock()), \
         patch.object(workflow_engine._agents["instruction_analysis"], "execute", new=AsyncMock(return_value=escalation_result)):

        response = await client.post(
            "/api/workflow/test-proj/analyse",
            json={"document_text": "Do something.", "document_type": "brief"}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["result"]["escalation_required"] is True
    assert data["result"]["confidence_score"] < 0.6


# ── TC-10: Edge — missing data defaults applied ───────────────────────

@pytest.mark.asyncio
async def test_TC10_missing_deadline_uses_safe_default():
    """TC-10: MissingDataHandler fills missing deadline with safe default."""
    from edge_cases.missing_data_handler import MissingDataHandler
    handler = MissingDataHandler()
    ctx = {"project_id": "test", "document_type": "brief"}
    filled = handler.fill_defaults(ctx)

    assert "deadline_date" in filled
    assert filled["deadline_date"] == "14 days from today"
    assert "team_size" in filled
    assert filled["team_size"] == 3
    assert "_filled_defaults" in filled
    assert "deadline_date" in filled["_filled_defaults"]
    flags = handler.get_uncertainty_flags(filled["_filled_defaults"])
    assert len(flags) > 0


# ── TC-12: Redis state deleted mid-pipeline ───────────────────────────

@pytest.mark.asyncio
async def test_TC12_missing_state_handled_gracefully(client):
    """TC-12: If Redis has no state (evicted), plan endpoint returns 422."""
    from orchestrator.workflow_engine import workflow_engine
    # Return empty state (as if Redis key was evicted)
    evicted_state = {
        "project_id": "test-proj", "workflow_stage": "created",
        "structured_goals": [],  # empty — as if never analysed
        "members": [], "tasks": [], "milestones": [],
    }

    with patch.object(workflow_engine.state_manager, "get", new=AsyncMock(return_value=evicted_state)):
        response = await client.post(
            "/api/workflow/test-proj/plan",
            json={"deadline_date": "2025-12-01"}
        )

    # Should fail gracefully with 422, not 500
    assert response.status_code == 422
    assert response.json().get("detail"), "Should include error detail"


# ── TC-13: GLM API rate limit retry ──────────────────────────────────

@pytest.mark.asyncio
async def test_TC13_glm_rate_limit_retried():
    """TC-13: GLM client retries on 429 and eventually returns result."""
    import httpx
    from glm.client import GLMClient

    call_count = 0
    async def mock_post(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count <= 2:
            mock_resp = MagicMock()
            mock_resp.status_code = 429
            mock_resp.raise_for_status.side_effect = httpx.HTTPStatusError(
                "429 Rate Limited", request=MagicMock(), response=mock_resp
            )
            return mock_resp
        else:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.raise_for_status = MagicMock()
            mock_resp.json.return_value = {
                "choices": [{"message": {"content": '{"structured_goals": [], "confidence_score": 0.8}'}}]
            }
            return mock_resp

    client_obj = GLMClient()
    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_ctx = MagicMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=mock_ctx)
        mock_ctx.__aexit__ = AsyncMock(return_value=False)
        mock_ctx.post = AsyncMock(side_effect=mock_post)
        mock_client_cls.return_value = mock_ctx

        result = await client_obj.chat([{"role": "user", "content": "test"}])

    assert call_count == 3, f"Expected 3 attempts (2 retries), got {call_count}"
    assert "structured_goals" in result


# ── TC-11: WebSocket connects and receives events ─────────────────────

@pytest.mark.asyncio
async def test_TC11_websocket_connects_successfully():
    """TC-11: WebSocket connects and receives the initial connected message."""
    # Use starlette's WebSocket test client
    from starlette.testclient import TestClient
    import threading

    received = []

    def ws_test():
        with TestClient(app) as test_client:
            with test_client.websocket_connect("/ws/projects/test-proj") as ws:
                msg = ws.receive_json()
                received.append(msg)

    # Run in thread (WebSocket test is synchronous in Starlette)
    t = threading.Thread(target=ws_test, daemon=True)
    t.start()
    t.join(timeout=5)

    assert len(received) == 1, "Expected 1 initial message from WebSocket"
    assert received[0]["type"] == "connected"
    assert received[0]["project_id"] == "test-proj"