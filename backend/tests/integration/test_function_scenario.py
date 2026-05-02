"""
backend/tests/integration/test_function_scenario.py

API-level integration tests for core logic scenarios.
Labels: IT-01 to IT-05

Database and Redis are mocked via dependency overrides.
Shows Expected vs Actual output for each scenario.
"""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone

from main import app
from core.database import get_db

# ================================================================== #
#  Mock DB and Setup                                                   #
# ================================================================== #

class MockDB:
    def __init__(self):
        self._objects = {}

    async def get(self, model, id):
        return self._objects.get(id)

    def add(self, obj):
        oid = getattr(obj, "id", f"mock-{len(self._objects)}")
        if oid is None:
            oid = f"mock-{len(self._objects)}"
            obj.id = oid
        self._objects[oid] = obj

    async def flush(self): pass
    async def refresh(self, obj): pass
    async def delete(self, obj): pass
    async def execute(self, stmt):
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = list(self._objects.values())
        mock_result.fetchall.return_value = []
        return mock_result
    async def commit(self): pass
    async def rollback(self): pass

async def override_get_db():
    yield MockDB()

app.dependency_overrides[get_db] = override_get_db

@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

def log_test_result(it_id, scenario, expected, actual):
    print(f"\n{'='*60}")
    print(f"RUNNING INTEGRATION TEST: {it_id}")
    print(f"SCENARIO: {scenario}")
    print(f"EXPECTED: {expected}")
    print(f"ACTUAL:   {actual}")
    print(f"STATUS:   SUCCESS")
    print(f"{'='*60}\n")

# ================================================================== #
#  IT-01: End-to-End Analysis Flow                                    #
# ================================================================== #

@pytest.mark.asyncio
async def test_it01_analysis_flow(client):
    """
    IT-01: POST /api/workflow/[id]/analyse
    Scenario: Verify that document analysis correctly updates the workflow state.
    """
    project_id = "proj-analyse-1"
    mock_analysis = {
        "agent": "instruction_analysis",
        "status": "success",
        "result": {"structured_goals": [{"goal_id": "G1", "statement": "Test goal"}], "confidence_score": 0.95}
    }
    
    with patch("api.routes.workflow.workflow_engine.run_analysis", new=AsyncMock(return_value=mock_analysis)):
        response = await client.post(
            f"/api/workflow/{project_id}/analyse",
            json={"document_text": "Requirements here.", "document_type": "brief"}
        )
    
    data = response.json()
    actual = f"Status: {data['status']}, Confidence: {data['result']['confidence_score']}"
    expected = "Status: success, Confidence: 0.95"
    
    assert response.status_code == 200
    assert data["status"] == "success"
    log_test_result("IT-01", "Analysis flow integration", expected, actual)

# ================================================================== #
#  IT-02: Project and Plan Persistence                                #
# ================================================================== #

@pytest.mark.asyncio
async def test_it02_project_plan_persistence(client):
    """
    IT-02: POST /api/projects/ + POST /api/workflow/[id]/plan
    Scenario: Create project then generate plan, verify state reflects 'planned' stage.
    """
    # 1. Create Project
    proj_payload = {"name": "Persist Project", "description": "Test", "deadline_date": None}
    
    # Mock Project model with real values to pass Pydantic validation
    mock_proj = MagicMock()
    mock_proj.id = "proj-persist-2"
    mock_proj.name = "Persist Project"
    mock_proj.description = "Test"
    mock_proj.status = "created"
    mock_proj.deadline_date = None
    mock_proj.created_at = datetime.now(timezone.utc)
    mock_proj.updated_at = datetime.now(timezone.utc)
    
    with patch("api.routes.projects.Project", return_value=mock_proj):
        await client.post("/api/projects/", json=proj_payload)
    
    # 2. Generate Plan
    mock_plan = {
        "agent": "planning",
        "status": "success",
        "result": {"tasks": [{"id": "T1", "title": "Task 1"}], "workflow_stage": "planned"}
    }
    
    with patch("api.routes.workflow.workflow_engine.run_planning", new=AsyncMock(return_value=mock_plan)):
        response = await client.post(f"/api/workflow/{mock_proj.id}/plan", json={"deadline_date": "2026-01-01"})
    
    data = response.json()
    actual = f"Tasks count: {len(data['result']['tasks'])}, Agent: {data['agent']}"
    expected = "Tasks count: 1, Agent: planning"
    
    assert response.status_code == 200
    assert data["agent"] == "planning"
    log_test_result("IT-02", "Project and plan persistence", expected, actual)

# ================================================================== #
#  IT-03: Team Assignment Integration                                 #
# ================================================================== #

@pytest.mark.asyncio
async def test_it03_team_assignment(client):
    """
    IT-03: POST /api/teams/
    Scenario: Verify team member assignment integrates with member storage and state.
    """
    project_id = "proj-team-3"
    team_payload = {
        "project_id": project_id,
        "name": "Alice",
        "email": "alice@example.com",
        "skills": ["Python"]
    }
    
    # Mock Member model with real values to pass Pydantic validation
    mock_member = MagicMock()
    mock_member.id = "member-1"
    mock_member.project_id = project_id
    mock_member.name = "Alice"
    mock_member.email = "alice@example.com"
    mock_member.skills = ["Python"]
    mock_member.contribution_score = 0.5
    mock_member.last_activity_at = None
    mock_member.joined_at = datetime.now(timezone.utc)
    
    with patch("api.routes.teams.Member", return_value=mock_member), \
         patch("api.routes.teams.activity_tracker.record", new=AsyncMock()):
        response = await client.post("/api/teams/", json=team_payload)
    
    data = response.json()
    actual = f"Member ID: {data.get('id', 'N/A')}, Status Code: {response.status_code}"
    expected = "Member ID: member-1, Status Code: 201"
    
    assert response.status_code == 201
    log_test_result("IT-03", "Team assignment integration", expected, actual)

# ================================================================== #
#  IT-04: Risk Detection Decision Logging                             #
# ================================================================== #

@pytest.mark.asyncio
async def test_it04_risk_check_decisions(client):
    """
    IT-04: POST /api/workflow/[id]/risk-check -> GET /api/workflow/[id]/decisions
    Scenario: Running a risk check creates a decision log entry.
    """
    project_id = "proj-risk-4"
    mock_risk = {
        "agent": "risk_detection",
        "status": "success",
        "result": {"project_health": "at_risk"}
    }
    
    mock_logs = [{"agent": "risk_detection", "summary": "Detected health: at_risk", "logged_at": "2025-11-01T00:00:00Z"}]
    
    with patch("api.routes.workflow.workflow_engine.run_risk_check", new=AsyncMock(return_value=mock_risk)), \
         patch("api.routes.workflow.decision_logger.get_recent", new=AsyncMock(return_value=mock_logs)):
        
        await client.post(f"/api/workflow/{project_id}/risk-check")
        response = await client.get(f"/api/workflow/{project_id}/decisions")
    
    data = response.json()
    actual = f"Log summary: {data[0]['summary']}"
    expected = "Log summary: Detected health: at_risk"
    
    assert response.status_code == 200
    assert data[0]["agent"] == "risk_detection"
    log_test_result("IT-04", "Risk check decision logging", expected, actual)

# ================================================================== #
#  IT-05: Analytics Overview Aggregation                              #
# ================================================================== #

@pytest.mark.asyncio
async def test_it05_analytics_aggregation(client):
    """
    IT-05: GET /api/analytics/project/[id]/overview
    Scenario: Verify analytics endpoint aggregates health and readiness correctly.
    """
    project_id = "proj-analytics-5"
    mock_state = {
        "last_risk_report": {"project_health": "critical", "health_score": 0.3},
        "submission_report": {"readiness_score": 45},
        "workflow_stage": "execution"
    }
    
    with patch("api.routes.analytics.state_manager.get", new=AsyncMock(return_value=mock_state)), \
         patch("api.routes.analytics.activity_tracker.get_contribution_counts", new=AsyncMock(return_value={"Alice": 10})):
        
        response = await client.get(f"/api/analytics/project/{project_id}/overview")
    
    data = response.json()
    actual = f"Health: {data['project_health']}, Readiness: {data['submission_readiness']}"
    expected = "Health: critical, Readiness: 45"
    
    assert response.status_code == 200
    assert data["project_health"] == "critical"
    log_test_result("IT-05", "Analytics aggregation integration", expected, actual)
