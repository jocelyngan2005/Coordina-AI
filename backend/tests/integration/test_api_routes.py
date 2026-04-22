"""tests/integration/test_api_routes.py

API-level integration tests using FastAPI's TestClient.
Database and Redis are mocked via dependency overrides.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport

from main import app
from core.database import get_db


# ------------------------------------------------------------------ #
#  Mock DB session                                                     #
# ------------------------------------------------------------------ #

class MockDB:
    """Minimal async DB session mock."""
    def __init__(self):
        self._objects = {}

    async def get(self, model, id):
        return self._objects.get(id)

    def add(self, obj):
        self._objects[getattr(obj, "id", "mock")] = obj

    async def flush(self):
        pass

    async def refresh(self, obj):
        pass

    async def delete(self, obj):
        pass

    async def execute(self, stmt):
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_result.fetchall.return_value = []
        return mock_result

    async def commit(self):
        pass

    async def rollback(self):
        pass


async def override_get_db():
    yield MockDB()


app.dependency_overrides[get_db] = override_get_db


# ------------------------------------------------------------------ #
#  Fixtures                                                            #
# ------------------------------------------------------------------ #

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


# ------------------------------------------------------------------ #
#  Health check                                                        #
# ------------------------------------------------------------------ #

@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


# ------------------------------------------------------------------ #
#  Projects                                                            #
# ------------------------------------------------------------------ #

@pytest.mark.asyncio
async def test_create_project(client):
    payload = {"name": "Test Project", "description": "A test", "deadline_date": None}
    with patch("api.routes.projects.Project") as MockProject:
        instance = MagicMock()
        instance.id = "proj-123"
        instance.name = "Test Project"
        instance.description = "A test"
        instance.status = "created"
        instance.deadline_date = None
        instance.created_at = "2025-11-01T00:00:00Z"
        instance.updated_at = "2025-11-01T00:00:00Z"
        MockProject.return_value = instance

        response = await client.post("/api/projects/", json=payload)
        assert response.status_code == 201


@pytest.mark.asyncio
async def test_list_projects_returns_empty(client):
    response = await client.get("/api/projects/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


# ------------------------------------------------------------------ #
#  Workflow                                                            #
# ------------------------------------------------------------------ #

@pytest.mark.asyncio
async def test_workflow_analyse_endpoint(client):
    mock_result = {
        "agent": "instruction_analysis",
        "status": "success",
        "result": {"structured_goals": [], "confidence_score": 0.9, "escalation_required": False},
    }
    with patch("api.routes.workflow.workflow_engine.run_analysis", new=AsyncMock(return_value=mock_result)):
        response = await client.post(
            "/api/workflow/proj-123/analyse",
            json={"document_text": "Build a system.", "document_type": "brief"},
        )
    assert response.status_code == 200
    assert response.json()["status"] == "success"


@pytest.mark.asyncio
async def test_workflow_plan_endpoint(client):
    mock_result = {
        "agent": "planning",
        "status": "success",
        "result": {"tasks": [], "milestones": [], "critical_path": [], "total_estimated_hours": 0},
    }
    with patch("api.routes.workflow.workflow_engine.run_planning", new=AsyncMock(return_value=mock_result)):
        response = await client.post(
            "/api/workflow/proj-123/plan",
            json={"deadline_date": "2025-12-01"},
        )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_workflow_risk_check_endpoint(client):
    mock_result = {
        "agent": "risk_detection",
        "status": "success",
        "result": {"project_health": "on_track", "deadline_failure_probability": 0.1},
    }
    with patch("api.routes.workflow.workflow_engine.run_risk_check", new=AsyncMock(return_value=mock_result)):
        response = await client.post("/api/workflow/proj-123/risk-check")
    assert response.status_code == 200
    assert response.json()["result"]["project_health"] == "on_track"


@pytest.mark.asyncio
async def test_workflow_state_endpoint(client):
    mock_state = {
        "project_id": "proj-123",
        "workflow_stage": "planned",
        "structured_goals": [],
        "tasks": [],
        "milestones": [],
        "members": [],
        "role_assignments": [],
        "last_risk_report": {},
        "submission_report": {},
        "deadline_date": None,
        "updated_at": "2025-11-01T00:00:00Z",
    }
    with patch("api.routes.workflow.state_manager.get", new=AsyncMock(return_value=mock_state)):
        response = await client.get("/api/workflow/proj-123/state")
    assert response.status_code == 200
    assert response.json()["workflow_stage"] == "planned"


@pytest.mark.asyncio
async def test_workflow_decision_log_endpoint(client):
    mock_logs = [
        {"agent": "planning", "summary": "Generated 3 tasks", "output": {}, "logged_at": "2025-11-01T00:00:00Z"}
    ]
    with patch("api.routes.workflow.decision_logger.get_recent", new=AsyncMock(return_value=mock_logs)):
        response = await client.get("/api/workflow/proj-123/decisions?limit=10")
    assert response.status_code == 200
    assert len(response.json()) == 1


# ------------------------------------------------------------------ #
#  Agents direct invocation                                            #
# ------------------------------------------------------------------ #

@pytest.mark.asyncio
async def test_agent_run_valid_type(client):
    mock_result = {"agent": "detect_risks", "status": "success", "result": {}}
    with patch("api.routes.agents.router_svc.route", new=AsyncMock(return_value=mock_result)):
        response = await client.post(
            "/api/agents/run",
            json={"task_type": "detect_risks", "context": {"project_id": "proj-123"}},
        )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_agent_types_endpoint(client):
    response = await client.get("/api/agents/types")
    assert response.status_code == 200
    assert "available_task_types" in response.json()
    assert "analyse_document" in response.json()["available_task_types"]


# ------------------------------------------------------------------ #
#  Analytics                                                           #
# ------------------------------------------------------------------ #

@pytest.mark.asyncio
async def test_analytics_overview_endpoint(client):
    mock_state = {
        "last_risk_report": {"project_health": "on_track", "health_score": 0.8},
        "submission_report": {"readiness_score": 75},
        "workflow_stage": "active",
    }
    with patch("api.routes.analytics.state_manager.get", new=AsyncMock(return_value=mock_state)), \
         patch("api.routes.analytics.activity_tracker.get_contribution_counts", new=AsyncMock(return_value={})):
        response = await client.get("/api/analytics/project/proj-123/overview")
    assert response.status_code == 200
    data = response.json()
    assert data["project_health"] == "on_track"
    assert data["submission_readiness"] == 75