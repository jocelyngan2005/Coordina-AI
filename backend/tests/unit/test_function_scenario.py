"""
backend/tests/unit/test_function_scenario.py

Targeted unit tests for core backend functions and logic scenarios.
Labels: UT-01 to UT-05

Modified to show expected vs actual output for visibility.
"""

import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone, timedelta

from edge_cases.inactivity_detector import inactivity_detector
from edge_cases.deadline_recovery import deadline_recovery
from memory.activity_tracker import activity_tracker
from agents.risk_detection_agent import RiskDetectionAgent, CRITICAL_FAILURE_PROBABILITY
from orchestrator.workflow_engine import workflow_engine

def log_test_result(ut_id, scenario, expected, actual):
    print(f"\n{'='*60}")
    print(f"RUNNING TEST: {ut_id}")
    print(f"SCENARIO: {scenario}")
    print(f"EXPECTED: {expected}")
    print(f"ACTUAL:   {actual}")
    print(f"STATUS:   SUCCESS")
    print(f"{'='*60}\n")

# ================================================================== #
#  UT-01: InactivityDetector severity logic                          #
# ================================================================== #

@pytest.mark.asyncio
async def test_ut01_inactivity_detector_severity():
    """
    UT-01: InactivityDetector.scan
    Scenario: Verify that tiered severity (warn/critical) is correctly assigned based on days.
    """
    now = datetime.now(timezone.utc)
    five_days_ago = (now - timedelta(days=5)).isoformat()
    two_days_ago = (now - timedelta(days=2)).isoformat()
    
    members = [{"id": "m1", "name": "Bob"}, {"id": "m2", "name": "Alice"}]
    
    with patch.object(activity_tracker, "get_member_last_activity", side_effect=[five_days_ago, two_days_ago]):
        report = await inactivity_detector.scan("proj-123", members)
    
    bob_severity = next(m["severity"] for m in report["inactive_members"] if m["member_id"] == "m1")
    alice_severity = next(m["severity"] for m in report["inactive_members"] if m["member_id"] == "m2")
    
    actual = f"Bob={bob_severity}, Alice={alice_severity}"
    expected = "Bob=critical, Alice=warn"
    
    assert bob_severity == "critical"
    assert alice_severity == "warn"
    
    log_test_result("UT-01", "Tiered inactivity severity", expected, actual)

# ================================================================== #
#  UT-02: DeadlineRecovery recovery plan generation                  #
# ================================================================== #

@pytest.mark.asyncio
async def test_ut02_deadline_recovery_plan_generation():
    """
    UT-02: DeadlineRecovery.generate_recovery_plan
    Scenario: Ensure reasoning engine output is correctly structured into the recovery plan.
    """
    mock_result = {
        "tasks_to_cut": ["T4", "T5"],
        "tasks_to_compress": [{"task_id": "T2", "new_estimated_hours": 2}],
        "priority_order": ["T1", "T2", "T3"],
        "recovery_message": "Heuristic timeline compression applied."
    }
    
    with patch("edge_cases.deadline_recovery.reasoning_engine.reason", new=AsyncMock(return_value=mock_result)), \
         patch("orchestrator.event_bus.EventBus.publish", new=AsyncMock()):
        plan = await deadline_recovery.generate_recovery_plan(
            project_id="proj-123", tasks=[], deadline_date="2026-01-01",
            current_date="2025-12-15", risk_report={"deadline_failure_probability": 0.8}
        )
    
    actual = f"Tasks to cut: {plan['tasks_to_cut']}"
    expected = "Tasks to cut: ['T4', 'T5']"
    
    assert "T4" in plan["tasks_to_cut"]
    assert "T5" in plan["tasks_to_cut"]
    
    log_test_result("UT-02", "Recovery plan structure", expected, actual)

# ================================================================== #
#  UT-03: ActivityTracker last activity retrieval                    #
# ================================================================== #

@pytest.mark.asyncio
async def test_ut03_activity_tracker_most_recent():
    """
    UT-03: ActivityTracker.get_member_last_activity
    Scenario: Verify that the most recent event is returned from historical logs.
    """
    member_id = "user-456"
    history = [
        {"member_id": member_id, "timestamp": "2026-05-01T10:00:00Z"},
        {"member_id": member_id, "timestamp": "2026-05-02T12:00:00Z"},
        {"member_id": "other",   "timestamp": "2026-05-03T10:00:00Z"}
    ]
    
    with patch.object(activity_tracker, "get_history", new=AsyncMock(return_value=history)):
        last_activity = await activity_tracker.get_member_last_activity("p1", member_id)
    
    actual = f"Last activity: {last_activity}"
    expected = "Last activity: 2026-05-02T12:00:00Z"
    
    assert last_activity == "2026-05-02T12:00:00Z"
    
    log_test_result("UT-03", "Most recent activity retrieval", expected, actual)

# ================================================================== #
#  UT-04: RiskDetectionAgent urgency thresholds                      #
# ================================================================== #

@pytest.mark.asyncio
async def test_ut04_risk_agent_urgency_thresholds():
    """
    UT-04: RiskDetectionAgent urgency logic
    Scenario: Probability exactly at CRITICAL_FAILURE_PROBABILITY triggers immediate urgency.
    """
    agent = RiskDetectionAgent()
    
    mock_glm_output = {
        "deadline_failure_probability": CRITICAL_FAILURE_PROBABILITY,
        "project_health": "critical",
        "risks": [{"description": "Major blocker"}]
    }
    
    with patch.object(agent, "_reason", new=AsyncMock(return_value=mock_glm_output)):
        result = await agent._run({"project_id": "p1", "members": [], "tasks": []})
    
    actual = f"Urgency: {result['recovery_urgency']}, Triggered: {result['auto_recovery_triggered']}"
    expected = f"Urgency: immediate, Triggered: True"
    
    assert result["auto_recovery_triggered"] is True
    assert result["recovery_urgency"] == "immediate"
    
    log_test_result("UT-04", "Critical risk urgency trigger", expected, actual)

# ================================================================== #
#  UT-05: WorkflowEngine Risk Check Integration                      #
# ================================================================== #

@pytest.mark.asyncio
async def test_ut05_workflow_engine_risk_integration():
    """
    UT-05: WorkflowEngine.run_risk_check
    Scenario: Verify engine merges inactivity data into the final risk report.
    """
    mock_state = {"tasks": [], "members": [{"id": "m1", "name": "A"}], "deadline_date": "2026-01-01"}
    mock_agent_output = {"status": "success", "result": {"deadline_failure_probability": 0.1, "project_health": "on_track"}}
    mock_inactivity = {"inactive_members": [{"member_id": "m1", "severity": "warn"}], "active_members": [], "redistribution_needed": False}
    
    with patch.object(workflow_engine.state_manager, "get", new=AsyncMock(return_value=mock_state)), \
         patch.object(workflow_engine._agents["risk_detection"], "execute", new=AsyncMock(return_value=mock_agent_output)), \
         patch.object(inactivity_detector, "scan", new=AsyncMock(return_value=mock_inactivity)), \
         patch.object(workflow_engine.state_manager, "save", new=AsyncMock()), \
         patch.object(workflow_engine.event_bus, "publish", new=AsyncMock()):
        
        output = await workflow_engine.run_risk_check("p1")
    
    actual = f"Report has inactivity_report: {'inactivity_report' in output['result']}"
    expected = "Report has inactivity_report: True"
    
    assert "inactivity_report" in output["result"]
    assert output["result"]["inactivity_report"]["inactive_members"][0]["member_id"] == "m1"
    
    log_test_result("UT-05", "Risk check orchestration merge", expected, actual)
