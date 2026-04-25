"""
tests/unit/test_agents.py

Unit tests for all five Coordina AI agents.
All GLM/reasoning calls are mocked — no network required.

Coverage:
  - InstructionAnalysisAgent
  - PlanningAgent
  - CoordinationAgent
  - RiskDetectionAgent
  - SubmissionReadinessAgent
  - BaseAgent (error handling, timing, output envelope)
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone

from agents.instruction_analysis_agent import InstructionAnalysisAgent
from agents.planning_agent import PlanningAgent
from agents.coordination_agent import CoordinationAgent
from agents.risk_detection_agent import RiskDetectionAgent, CRITICAL_FAILURE_PROBABILITY, HIGH_FAILURE_PROBABILITY
from agents.submission_readiness_agent import SubmissionReadinessAgent, READY_THRESHOLD, NEEDS_WORK_THRESHOLD


# ================================================================== #
#  Shared fixtures                                                     #
# ================================================================== #

@pytest.fixture
def analysis_context():
    return {
        "project_id": "proj-001",
        "document_text": "Build a full-stack web app with AI integration. Submit a 3000-word report.",
        "document_type": "brief",
    }


@pytest.fixture
def planning_context():
    return {
        "project_id": "proj-001",
        "structured_goals": [
            {"goal_id": "G1", "statement": "Build backend API", "priority": "high"},
            {"goal_id": "G2", "statement": "Integrate GLM", "priority": "critical"},
        ],
        "team_size": 3,
        "deadline_date": "2025-12-01",
        "project_start_date": "2025-11-17",
        "existing_tasks": [],
        "days_available": 14,
    }


@pytest.fixture
def coordination_context():
    return {
        "project_id": "proj-001",
        "members": [
            {"id": "m1", "name": "Alice", "skills": ["python", "backend"], "contribution_score": 0.8},
            {"id": "m2", "name": "Bob",   "skills": ["react", "frontend"], "contribution_score": 0.5},
        ],
        "tasks": [
            {"task_id": "T1", "title": "API setup",  "estimated_hours": 5, "priority": "high"},
            {"task_id": "T2", "title": "UI build",   "estimated_hours": 4, "priority": "medium"},
        ],
        "activity_history": [],
        "project_phase": "execution",
    }


@pytest.fixture
def risk_context():
    return {
        "project_id": "proj-001",
        "tasks": [
            {"task_id": "T1", "title": "API setup", "status": "done",        "completion_pct": 100},
            {"task_id": "T2", "title": "UI build",  "status": "in_progress", "completion_pct": 40},
        ],
        "members": [
            {"id": "m1", "name": "Alice", "last_activity_at": "2025-11-17T10:00:00Z"},
            {"id": "m2", "name": "Bob",   "last_activity_at": "2025-11-15T08:00:00Z"},
        ],
        "deadline_date": "2025-12-01",
        "current_date": "2025-11-17",
        "decision_history": [],
    }


@pytest.fixture
def submission_context():
    return {
        "project_id": "proj-001",
        "rubric_criteria": [
            {"criterion": "System Architecture", "weight_pct": 30},
            {"criterion": "Code Quality",        "weight_pct": 25},
            {"criterion": "Documentation",       "weight_pct": 20},
        ],
        "completed_deliverables": ["API", "Architecture Diagram", "README"],
        "uploaded_artefacts": ["report.pdf", "diagram.png", "README.md"],
    }


# ================================================================== #
#  Mock GLM responses                                                  #
# ================================================================== #

GOOD_ANALYSIS = {
    "deliverables": [
        {"id": "D1", "title": "Web App",  "description": "Full-stack app", "weight_pct": 60},
        {"id": "D2", "title": "Report",   "description": "3000-word doc",  "weight_pct": 40},
    ],
    "grading_priorities": [
        {"criterion": "Architecture", "weight_pct": 30, "notes": "Diagram required"},
        {"criterion": "Code Quality", "weight_pct": 25, "notes": "Modular"},
    ],
    "implicit_expectations": ["Unit tests", "Git history"],
    "ambiguities": [],
    "structured_goals": [
        {"goal_id": "G1", "statement": "Build full-stack web app", "priority": "high"},
        {"goal_id": "G2", "statement": "Write 3000-word report",   "priority": "medium"},
    ],
    "confidence_score": 0.92,
}

AMBIGUOUS_ANALYSIS = {
    **GOOD_ANALYSIS,
    "confidence_score": 0.45,
    "ambiguities": [
        {"issue": "Unclear framework requirement", "suggested_clarification": "Which framework?"},
        {"issue": "Word count ambiguous",           "suggested_clarification": "Minimum or target?"},
    ],
}

GOOD_PLAN = {
    "tasks": [
        {"id": "T1", "title": "DB schema",    "description": "Design schema",
         "estimated_hours": 3,  "priority": "critical", "dependencies": [],     "milestone_id": "M1"},
        {"id": "T2", "title": "API endpoints","description": "Build API",
         "estimated_hours": 6,  "priority": "high",     "dependencies": ["T1"], "milestone_id": "M1"},
        {"id": "T3", "title": "GLM hookup",   "description": "Integrate GLM",
         "estimated_hours": 8,  "priority": "critical", "dependencies": ["T2"], "milestone_id": "M2"},
        {"id": "T4", "title": "Frontend",     "description": "React UI",
         "estimated_hours": 6,  "priority": "high",     "dependencies": ["T2"], "milestone_id": "M2"},
        {"id": "T5", "title": "Write report", "description": "Documentation",
         "estimated_hours": 4,  "priority": "medium",   "dependencies": [],     "milestone_id": "M3"},
    ],
    "milestones": [
        {"milestone_id": "M1", "title": "Backend foundation", "due_date_offset_days": 5,  "tasks": ["T1", "T2"]},
        {"milestone_id": "M2", "title": "Core features",      "due_date_offset_days": 10, "tasks": ["T3", "T4"]},
        {"milestone_id": "M3", "title": "Finalisation",       "due_date_offset_days": 14, "tasks": ["T5"]},
    ],
    "critical_path": ["T1", "T2", "T3"],
    "total_estimated_hours": 27,
    "risk_flags": ["T3 has no buffer time"],
}

GOOD_COORDINATION = {
    "role_assignments": [
        {"member_id": "m1", "member_name": "Alice", "assigned_role": "Backend Lead",
         "assigned_tasks": ["T1", "T2", "T3"], "workload_hours": 17, "reasoning": "Python skills"},
        {"member_id": "m2", "member_name": "Bob",   "assigned_role": "Frontend Lead",
         "assigned_tasks": ["T4"],             "workload_hours": 6,  "reasoning": "React skills"},
    ],
    "workload_balance": {"status": "balanced", "notes": "Alice heavier but skilled"},
    "meeting_agenda": [
        {"order": 1, "topic": "Sprint review",   "duration_minutes": 10, "owner": "Alice"},
        {"order": 2, "topic": "Blockers",         "duration_minutes": 10, "owner": "All"},
        {"order": 3, "topic": "Next sprint plan", "duration_minutes": 15, "owner": "Alice"},
    ],
    "accountability_pairs": [
        {"task_id": "T3", "primary": "m1", "reviewer": "m2"},
    ],
    "flags": [],
}

SAFE_RISK = {
    "project_health": "on_track",
    "health_score": 0.82,
    "deadline_failure_probability": 0.12,
    "risks": [],
    "inactive_members": [],
    "recovery_actions": [],
}

HIGH_RISK = {
    "project_health": "at_risk",
    "health_score": 0.45,
    "deadline_failure_probability": HIGH_FAILURE_PROBABILITY + 0.05,
    "risks": [
        {"risk_id": "R1", "type": "deadline", "severity": "high",
         "description": "T3 not started", "affected_tasks": ["T3"], "affected_members": ["m1"]},
    ],
    "inactive_members": [
        {"member_id": "m2", "last_activity_days_ago": 3, "recommended_action": "Follow up with Bob"},
    ],
    "recovery_actions": [
        {"action_id": "A1", "description": "Compress T5", "target": "task", "priority": "soon"},
    ],
}

CRITICAL_RISK = {
    **HIGH_RISK,
    "project_health": "critical",
    "deadline_failure_probability": CRITICAL_FAILURE_PROBABILITY + 0.05,
}

GOOD_SUBMISSION = {
    "readiness_score": 88,
    "rubric_coverage": [
        {"criterion": "System Architecture", "weight_pct": 30, "status": "covered",
         "evidence": "diagram.png submitted", "notes": ""},
        {"criterion": "Code Quality",        "weight_pct": 25, "status": "covered",
         "evidence": "Code reviewed",         "notes": ""},
        {"criterion": "Documentation",       "weight_pct": 20, "status": "partial",
         "evidence": "README exists",          "notes": "Needs API docs"},
    ],
    "missing_artefacts": ["api_docs.md"],
    "submission_checklist": [
        {"item": "Architecture diagram", "status": "done",    "owner": "Alice"},
        {"item": "Code repository",      "status": "done",    "owner": "Alice"},
        {"item": "API documentation",    "status": "pending", "owner": "Bob"},
        {"item": "Final report PDF",     "status": "done",    "owner": "Alice"},
    ],
    "last_minute_risks": ["API docs still pending"],
    "recommendation": "needs_work",
}


# ================================================================== #
#  BaseAgent — output envelope and error handling                      #
# ================================================================== #

class TestBaseAgentBehaviour:

    @pytest.mark.asyncio
    async def test_success_output_has_required_keys(self):
        agent = InstructionAnalysisAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=GOOD_ANALYSIS)):
            output = await agent.execute({"project_id": "p1", "document_text": "x", "document_type": "brief"})

        assert output["status"] == "success"
        assert output["agent"] == "instruction_analysis"
        assert "result" in output
        assert "executed_at" in output
        assert "duration_seconds" in output

    @pytest.mark.asyncio
    async def test_error_output_has_required_keys(self):
        agent = InstructionAnalysisAgent()
        with patch.object(agent, "_reason", new=AsyncMock(side_effect=Exception("timeout"))):
            output = await agent.execute({"project_id": "p1", "document_text": "x", "document_type": "brief"})

        assert output["status"] == "error"
        assert "error" in output
        assert "timeout" in output["error"]
        assert "result" not in output

    @pytest.mark.asyncio
    async def test_duration_seconds_is_non_negative(self):
        agent = InstructionAnalysisAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=GOOD_ANALYSIS)):
            output = await agent.execute({"project_id": "p1", "document_text": "x", "document_type": "brief"})
        assert output["duration_seconds"] >= 0

    @pytest.mark.asyncio
    async def test_executed_at_is_valid_iso_timestamp(self):
        agent = InstructionAnalysisAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=GOOD_ANALYSIS)):
            output = await agent.execute({"project_id": "p1", "document_text": "x", "document_type": "brief"})
        # Should not raise
        datetime.fromisoformat(output["executed_at"])


# ================================================================== #
#  InstructionAnalysisAgent                                            #
# ================================================================== #

class TestInstructionAnalysisAgent:

    @pytest.mark.asyncio
    async def test_returns_structured_goals(self, analysis_context):
        agent = InstructionAnalysisAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=GOOD_ANALYSIS)):
            output = await agent.execute(analysis_context)
        assert len(output["result"]["structured_goals"]) == 2
        assert output["result"]["structured_goals"][0]["goal_id"] == "G1"

    @pytest.mark.asyncio
    async def test_returns_grading_priorities(self, analysis_context):
        agent = InstructionAnalysisAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=GOOD_ANALYSIS)):
            output = await agent.execute(analysis_context)
        priorities = output["result"]["grading_priorities"]
        assert len(priorities) == 2
        weights = [p["weight_pct"] for p in priorities]
        assert 30 in weights

    @pytest.mark.asyncio
    async def test_returns_implicit_expectations(self, analysis_context):
        agent = InstructionAnalysisAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=GOOD_ANALYSIS)):
            output = await agent.execute(analysis_context)
        assert "Unit tests" in output["result"]["implicit_expectations"]

    @pytest.mark.asyncio
    async def test_high_confidence_no_escalation(self, analysis_context):
        agent = InstructionAnalysisAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=GOOD_ANALYSIS)):
            output = await agent.execute(analysis_context)
        assert output["result"]["escalation_required"] is False

    @pytest.mark.asyncio
    async def test_low_confidence_triggers_escalation(self, analysis_context):
        agent = InstructionAnalysisAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=AMBIGUOUS_ANALYSIS)):
            output = await agent.execute(analysis_context)
        assert output["result"]["escalation_required"] is True
        assert "escalation_reason" in output["result"]

    @pytest.mark.asyncio
    async def test_escalation_threshold_is_exactly_0_6(self, analysis_context):
        """Confidence exactly at 0.6 should NOT escalate (threshold is < 0.6)."""
        agent = InstructionAnalysisAgent()
        boundary_result = {**GOOD_ANALYSIS, "confidence_score": 0.6}
        with patch.object(agent, "_reason", new=AsyncMock(return_value=boundary_result)):
            output = await agent.execute(analysis_context)
        assert output["result"]["escalation_required"] is False

    @pytest.mark.asyncio
    async def test_confidence_just_below_threshold_escalates(self, analysis_context):
        agent = InstructionAnalysisAgent()
        boundary_result = {**GOOD_ANALYSIS, "confidence_score": 0.59}
        with patch.object(agent, "_reason", new=AsyncMock(return_value=boundary_result)):
            output = await agent.execute(analysis_context)
        assert output["result"]["escalation_required"] is True

    @pytest.mark.asyncio
    async def test_ambiguities_preserved_in_output(self, analysis_context):
        agent = InstructionAnalysisAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=AMBIGUOUS_ANALYSIS)):
            output = await agent.execute(analysis_context)
        assert len(output["result"]["ambiguities"]) == 2

    @pytest.mark.asyncio
    async def test_agent_name_is_correct(self):
        assert InstructionAnalysisAgent.agent_name == "instruction_analysis"

    @pytest.mark.asyncio
    async def test_prompt_template_is_correct(self):
        assert InstructionAnalysisAgent.prompt_template == "instruction_analysis"

    @pytest.mark.asyncio
    async def test_glm_failure_returns_error_status(self, analysis_context):
        agent = InstructionAnalysisAgent()
        with patch.object(agent, "_reason", new=AsyncMock(side_effect=Exception("GLM 503"))):
            output = await agent.execute(analysis_context)
        assert output["status"] == "error"
        assert "GLM 503" in output["error"]


# ================================================================== #
#  PlanningAgent                                                       #
# ================================================================== #

class TestPlanningAgent:

    @pytest.mark.asyncio
    async def test_tasks_get_default_pending_status(self, planning_context):
        agent = PlanningAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=GOOD_PLAN)):
            output = await agent.execute(planning_context)
        for task in output["result"]["tasks"]:
            assert task["status"] == "pending"

    @pytest.mark.asyncio
    async def test_existing_status_is_not_overwritten(self, planning_context):
        """Tasks that already have a status should keep it."""
        agent = PlanningAgent()
        plan_with_status = {
            **GOOD_PLAN,
            "tasks": [{**GOOD_PLAN["tasks"][0], "status": "in_progress"}] + GOOD_PLAN["tasks"][1:],
        }
        with patch.object(agent, "_reason", new=AsyncMock(return_value=plan_with_status)):
            output = await agent.execute(planning_context)
        assert output["result"]["tasks"][0]["status"] == "in_progress"

    @pytest.mark.asyncio
    async def test_capacity_analysis_added(self, planning_context):
        agent = PlanningAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=GOOD_PLAN)):
            output = await agent.execute(planning_context)
        cap = output["result"]["capacity_analysis"]
        assert "total_estimated_hours" in cap
        assert "team_capacity_hours" in cap
        assert "overloaded" in cap

    @pytest.mark.asyncio
    async def test_overloaded_flag_true_when_hours_exceed_capacity(self, planning_context):
        agent = PlanningAgent()
        # team_size=3, days=14, 2hrs/day = 84 capacity
        # force 200 hours → overloaded
        heavy_plan = {**GOOD_PLAN, "total_estimated_hours": 200}
        with patch.object(agent, "_reason", new=AsyncMock(return_value=heavy_plan)):
            output = await agent.execute(planning_context)
        assert output["result"]["capacity_analysis"]["overloaded"] is True

    @pytest.mark.asyncio
    async def test_overloaded_flag_false_when_within_capacity(self, planning_context):
        agent = PlanningAgent()
        light_plan = {**GOOD_PLAN, "total_estimated_hours": 10}
        with patch.object(agent, "_reason", new=AsyncMock(return_value=light_plan)):
            output = await agent.execute(planning_context)
        assert output["result"]["capacity_analysis"]["overloaded"] is False

    @pytest.mark.asyncio
    async def test_milestones_preserved(self, planning_context):
        agent = PlanningAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=GOOD_PLAN)):
            output = await agent.execute(planning_context)
        assert len(output["result"]["milestones"]) == 3

    @pytest.mark.asyncio
    async def test_critical_path_preserved(self, planning_context):
        agent = PlanningAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=GOOD_PLAN)):
            output = await agent.execute(planning_context)
        assert output["result"]["critical_path"] == ["T1", "T2", "T3"]

    @pytest.mark.asyncio
    async def test_risk_flags_preserved(self, planning_context):
        agent = PlanningAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=GOOD_PLAN)):
            output = await agent.execute(planning_context)
        assert len(output["result"]["risk_flags"]) == 1

    @pytest.mark.asyncio
    async def test_glm_failure_returns_error_status(self, planning_context):
        agent = PlanningAgent()
        with patch.object(agent, "_reason", new=AsyncMock(side_effect=RuntimeError("timeout"))):
            output = await agent.execute(planning_context)
        assert output["status"] == "error"


# ================================================================== #
#  CoordinationAgent                                                   #
# ================================================================== #

class TestCoordinationAgent:

    @pytest.mark.asyncio
    async def test_role_assignments_returned(self, coordination_context):
        agent = CoordinationAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=GOOD_COORDINATION)):
            output = await agent.execute(coordination_context)
        assert len(output["result"]["role_assignments"]) == 2

    @pytest.mark.asyncio
    async def test_meeting_agenda_returned(self, coordination_context):
        agent = CoordinationAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=GOOD_COORDINATION)):
            output = await agent.execute(coordination_context)
        agenda = output["result"]["meeting_agenda"]
        assert len(agenda) == 3
        assert agenda[0]["order"] == 1

    @pytest.mark.asyncio
    async def test_fairness_index_computed(self, coordination_context):
        agent = CoordinationAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=GOOD_COORDINATION)):
            output = await agent.execute(coordination_context)
        fi = output["result"]["fairness_index"]
        assert fi is not None
        assert 0.0 <= fi <= 1.0

    @pytest.mark.asyncio
    async def test_perfectly_equal_workload_gives_fairness_1(self, coordination_context):
        agent = CoordinationAgent()
        equal_coord = {
            **GOOD_COORDINATION,
            "role_assignments": [
                {"member_id": "m1", "member_name": "Alice", "assigned_role": "Dev",
                 "assigned_tasks": ["T1"], "workload_hours": 5, "reasoning": ""},
                {"member_id": "m2", "member_name": "Bob",   "assigned_role": "Dev",
                 "assigned_tasks": ["T2"], "workload_hours": 5, "reasoning": ""},
            ],
        }
        with patch.object(agent, "_reason", new=AsyncMock(return_value=equal_coord)):
            output = await agent.execute(coordination_context)
        assert output["result"]["fairness_index"] == 1.0

    @pytest.mark.asyncio
    async def test_empty_assignments_fairness_index_is_none(self, coordination_context):
        agent = CoordinationAgent()
        empty_coord = {**GOOD_COORDINATION, "role_assignments": []}
        with patch.object(agent, "_reason", new=AsyncMock(return_value=empty_coord)):
            output = await agent.execute(coordination_context)
        assert output["result"]["fairness_index"] is None

    @pytest.mark.asyncio
    async def test_accountability_pairs_preserved(self, coordination_context):
        agent = CoordinationAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=GOOD_COORDINATION)):
            output = await agent.execute(coordination_context)
        pairs = output["result"]["accountability_pairs"]
        assert len(pairs) == 1
        assert pairs[0]["task_id"] == "T3"

    @pytest.mark.asyncio
    async def test_workload_balance_status_preserved(self, coordination_context):
        agent = CoordinationAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=GOOD_COORDINATION)):
            output = await agent.execute(coordination_context)
        assert output["result"]["workload_balance"]["status"] == "balanced"

    @pytest.mark.asyncio
    async def test_glm_failure_returns_error_status(self, coordination_context):
        agent = CoordinationAgent()
        with patch.object(agent, "_reason", new=AsyncMock(side_effect=Exception("GLM down"))):
            output = await agent.execute(coordination_context)
        assert output["status"] == "error"


# ================================================================== #
#  RiskDetectionAgent                                                  #
# ================================================================== #

class TestRiskDetectionAgent:

    @pytest.mark.asyncio
    async def test_no_recovery_when_safe(self, risk_context):
        agent = RiskDetectionAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=SAFE_RISK)):
            output = await agent.execute(risk_context)
        assert output["result"]["auto_recovery_triggered"] is False
        assert output["result"]["recovery_urgency"] == "monitor"

    @pytest.mark.asyncio
    async def test_recovery_triggered_at_high_probability(self, risk_context):
        agent = RiskDetectionAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=HIGH_RISK)):
            output = await agent.execute(risk_context)
        assert output["result"]["auto_recovery_triggered"] is True
        assert output["result"]["recovery_urgency"] == "soon"

    @pytest.mark.asyncio
    async def test_immediate_urgency_at_critical_probability(self, risk_context):
        agent = RiskDetectionAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=CRITICAL_RISK)):
            output = await agent.execute(risk_context)
        assert output["result"]["auto_recovery_triggered"] is True
        assert output["result"]["recovery_urgency"] == "immediate"

    @pytest.mark.asyncio
    async def test_inactivity_alert_true_when_inactive_members(self, risk_context):
        agent = RiskDetectionAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=HIGH_RISK)):
            output = await agent.execute(risk_context)
        assert output["result"]["inactivity_alert"] is True

    @pytest.mark.asyncio
    async def test_inactivity_alert_false_when_all_active(self, risk_context):
        agent = RiskDetectionAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=SAFE_RISK)):
            output = await agent.execute(risk_context)
        assert output["result"]["inactivity_alert"] is False

    @pytest.mark.asyncio
    async def test_health_score_preserved(self, risk_context):
        agent = RiskDetectionAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=SAFE_RISK)):
            output = await agent.execute(risk_context)
        assert output["result"]["health_score"] == 0.82

    @pytest.mark.asyncio
    async def test_risks_list_preserved(self, risk_context):
        agent = RiskDetectionAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=HIGH_RISK)):
            output = await agent.execute(risk_context)
        assert len(output["result"]["identified_risks"]) == 1
        assert output["result"]["identified_risks"][0]["risk_id"] == "R1"

    @pytest.mark.asyncio
    async def test_recovery_actions_preserved(self, risk_context):
        agent = RiskDetectionAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=HIGH_RISK)):
            output = await agent.execute(risk_context)
        assert len(output["result"]["recovery_actions"]) == 1

    @pytest.mark.asyncio
    async def test_probability_exactly_at_high_threshold_triggers(self, risk_context):
        """Probability == HIGH_FAILURE_PROBABILITY should trigger recovery."""
        agent = RiskDetectionAgent()
        at_threshold = {**SAFE_RISK, "deadline_failure_probability": HIGH_FAILURE_PROBABILITY}
        with patch.object(agent, "_reason", new=AsyncMock(return_value=at_threshold)):
            output = await agent.execute(risk_context)
        assert output["result"]["auto_recovery_triggered"] is True

    @pytest.mark.asyncio
    async def test_probability_just_below_high_threshold_no_recovery(self, risk_context):
        agent = RiskDetectionAgent()
        below = {**SAFE_RISK, "deadline_failure_probability": HIGH_FAILURE_PROBABILITY - 0.01}
        with patch.object(agent, "_reason", new=AsyncMock(return_value=below)):
            output = await agent.execute(risk_context)
        assert output["result"]["auto_recovery_triggered"] is False

    @pytest.mark.asyncio
    async def test_glm_failure_returns_error_status(self, risk_context):
        agent = RiskDetectionAgent()
        with patch.object(agent, "_reason", new=AsyncMock(side_effect=Exception("Network error"))):
            output = await agent.execute(risk_context)
        assert output["status"] == "error"


# ================================================================== #
#  SubmissionReadinessAgent                                            #
# ================================================================== #

class TestSubmissionReadinessAgent:

    @pytest.mark.asyncio
    async def test_high_score_gives_ready_recommendation(self, submission_context):
        agent = SubmissionReadinessAgent()
        ready = {**GOOD_SUBMISSION, "readiness_score": READY_THRESHOLD}
        with patch.object(agent, "_reason", new=AsyncMock(return_value=ready)):
            output = await agent.execute(submission_context)
        assert output["result"]["recommendation"] == "ready_to_submit"

    @pytest.mark.asyncio
    async def test_medium_score_gives_needs_work_recommendation(self, submission_context):
        agent = SubmissionReadinessAgent()
        medium = {**GOOD_SUBMISSION, "readiness_score": NEEDS_WORK_THRESHOLD + 5}
        with patch.object(agent, "_reason", new=AsyncMock(return_value=medium)):
            output = await agent.execute(submission_context)
        assert output["result"]["recommendation"] == "needs_work"

    @pytest.mark.asyncio
    async def test_low_score_gives_not_ready_recommendation(self, submission_context):
        agent = SubmissionReadinessAgent()
        low = {**GOOD_SUBMISSION, "readiness_score": NEEDS_WORK_THRESHOLD - 1}
        with patch.object(agent, "_reason", new=AsyncMock(return_value=low)):
            output = await agent.execute(submission_context)
        assert output["result"]["recommendation"] == "not_ready"

    @pytest.mark.asyncio
    async def test_glm_recommendation_overridden_by_score(self, submission_context):
        """GLM says ready_to_submit but score is 30 — agent must override."""
        agent = SubmissionReadinessAgent()
        contradictory = {**GOOD_SUBMISSION, "readiness_score": 30, "recommendation": "ready_to_submit"}
        with patch.object(agent, "_reason", new=AsyncMock(return_value=contradictory)):
            output = await agent.execute(submission_context)
        assert output["result"]["recommendation"] == "not_ready"

    @pytest.mark.asyncio
    async def test_coverage_summary_computed(self, submission_context):
        agent = SubmissionReadinessAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=GOOD_SUBMISSION)):
            output = await agent.execute(submission_context)
        summary = output["result"]["coverage_summary"]
        assert summary["covered"] == 2
        assert summary["partial"] == 1
        assert summary["missing"] == 0
        assert summary["total"] == 3

    @pytest.mark.asyncio
    async def test_missing_artefacts_preserved(self, submission_context):
        agent = SubmissionReadinessAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=GOOD_SUBMISSION)):
            output = await agent.execute(submission_context)
        assert "api_docs.md" in output["result"]["missing_artefacts"]

    @pytest.mark.asyncio
    async def test_checklist_items_preserved(self, submission_context):
        agent = SubmissionReadinessAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=GOOD_SUBMISSION)):
            output = await agent.execute(submission_context)
        checklist = output["result"]["submission_checklist"]
        assert len(checklist) == 4
        statuses = {item["item"]: item["status"] for item in checklist}
        assert statuses["Code repository"] == "done"
        assert statuses["API documentation"] == "pending"

    @pytest.mark.asyncio
    async def test_last_minute_risks_preserved(self, submission_context):
        agent = SubmissionReadinessAgent()
        with patch.object(agent, "_reason", new=AsyncMock(return_value=GOOD_SUBMISSION)):
            output = await agent.execute(submission_context)
        assert len(output["result"]["last_minute_risks"]) == 1

    @pytest.mark.asyncio
    async def test_score_exactly_at_ready_threshold(self, submission_context):
        agent = SubmissionReadinessAgent()
        exact = {**GOOD_SUBMISSION, "readiness_score": READY_THRESHOLD}
        with patch.object(agent, "_reason", new=AsyncMock(return_value=exact)):
            output = await agent.execute(submission_context)
        assert output["result"]["recommendation"] == "ready_to_submit"

    @pytest.mark.asyncio
    async def test_score_exactly_at_needs_work_threshold(self, submission_context):
        agent = SubmissionReadinessAgent()
        exact = {**GOOD_SUBMISSION, "readiness_score": NEEDS_WORK_THRESHOLD}
        with patch.object(agent, "_reason", new=AsyncMock(return_value=exact)):
            output = await agent.execute(submission_context)
        assert output["result"]["recommendation"] == "needs_work"

    @pytest.mark.asyncio
    async def test_glm_failure_returns_error_status(self, submission_context):
        agent = SubmissionReadinessAgent()
        with patch.object(agent, "_reason", new=AsyncMock(side_effect=Exception("token limit exceeded"))):
            output = await agent.execute(submission_context)
        assert output["status"] == "error"
        assert "token limit exceeded" in output["error"]
