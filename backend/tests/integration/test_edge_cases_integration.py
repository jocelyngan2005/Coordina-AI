"""
tests/integration/test_edge_cases_integration.py

End-to-end tests validating that edge case handlers integrate correctly
with the workflow engine and agents.

Tests workflow scenarios where:
1. Ambiguities are detected and resolved
2. Missing data is filled with defaults
3. Inactive members trigger alerts
4. Deadline recovery activates
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone, timedelta

from orchestrator.workflow_engine import WorkflowEngine
from orchestrator.event_bus import EventBus
from orchestrator.state_manager import StateManager
from edge_cases.ambiguity_resolver import ambiguity_resolver
from edge_cases.inactivity_detector import inactivity_detector


# ================================================================== #
#  Fixtures                                                            #
# ================================================================== #

@pytest.fixture
def workflow_engine():
    """Create a workflow engine for testing."""
    return WorkflowEngine()


@pytest.fixture
def sample_brief():
    """Project brief with some ambiguities."""
    return """
    Project: Build an AI-powered system
    
    Deliverables:
    - A working prototype
    - Documentation
    - 3000-word report
    
    Note: Technology stack not specified. Framework choice to be decided.
    """


@pytest.fixture
def sample_project_state():
    """Minimal project state."""
    return {
        "project_id": "test-proj-001",
        "document_text": "Brief",
        "members": [
            {"id": "m1", "name": "Alice", "skills": ["python"]},
            {"id": "m2", "name": "Bob", "skills": ["react"]},
        ],
        "tasks": [
            {"task_id": "T1", "title": "Backend", "priority": "critical", "status": "pending"},
            {"task_id": "T2", "title": "Frontend", "priority": "high", "status": "pending"},
        ],
        "deadline_date": "2025-12-01",
        "activity_history": [],
    }


# ================================================================== #
#  E2E Test: Ambiguity Resolution Flow                                #
# ================================================================== #

class TestAmbiguityResolutionFlow:
    """
    Scenario: InstructionAnalysisAgent detects low confidence.
    Expected: AmbiguityResolver generates clarification questions.
    """

    @pytest.mark.asyncio
    async def test_ambiguities_trigger_resolver(self, workflow_engine, sample_brief):
        """When analysis detects ambiguities, resolver should be called."""
        
        # Mock the analysis agent to return low confidence with ambiguities
        analysis_output = {
            "status": "success",
            "success": True,
            "result": {
                "structured_goals": [
                    {"goal_id": "G1", "statement": "Build AI system", "priority": "high"}
                ],
                "grading_priorities": [],
                "ambiguities": [
                    {"issue": "Framework not specified", "suggested_clarification": "Which framework?"},
                    {"issue": "Deployment unclear", "suggested_clarification": "Cloud or local?"},
                ],
                "confidence_score": 0.5,  # Low confidence triggers resolver
            },
        }

        # Mock AmbiguityResolver response
        resolver_output = {
            "clarification_questions": [
                "Which web framework should be used?",
                "Should the system be deployed to cloud or run locally?",
            ],
            "working_assumptions": [
                {"assumption": "React will be used", "confidence": 0.7},
                {"assumption": "AWS deployment", "confidence": 0.6},
            ],
            "can_proceed": True,
        }

        with patch.object(
            workflow_engine._agents["instruction_analysis"],
            "execute",
            new=AsyncMock(return_value=analysis_output),
        ):
            with patch.object(
                ambiguity_resolver,
                "resolve",
                new=AsyncMock(return_value=resolver_output),
            ) as mock_resolve:
                # Mock state manager
                with patch.object(workflow_engine.state_manager, "get", new=AsyncMock(return_value={})):
                    with patch.object(workflow_engine.state_manager, "save", new=AsyncMock()):
                        with patch.object(workflow_engine.event_bus, "publish", new=AsyncMock()):
                            with patch.object(workflow_engine.decision_logger, "log", new=AsyncMock()):
                                result = await workflow_engine.run_analysis(
                                    "proj-001",
                                    sample_brief,
                                    "brief"
                                )

        # Verify ambiguity_resolution is in result
        assert result["result"]["ambiguity_resolution"] is not None
        assert len(result["result"]["ambiguity_resolution"]["clarification_questions"]) == 2
        assert result["result"]["confidence_score"] == 0.5

    @pytest.mark.asyncio
    async def test_ambiguity_event_published(self, workflow_engine, sample_brief):
        """Ambiguity detection should publish event on event bus."""
        
        analysis_output = {
            "status": "success",
            "success": True,
            "result": {
                "structured_goals": [],
                "grading_priorities": [],
                "ambiguities": [{"issue": "Unclear", "suggested_clarification": "Clarify"}],
                "confidence_score": 0.4,
            },
        }

        resolver_output = {
            "clarification_questions": ["Question 1"],
            "working_assumptions": [],
            "can_proceed": True,
        }

        published_events = []

        async def capture_event(event):
            published_events.append(event)

        with patch.object(
            workflow_engine._agents["instruction_analysis"],
            "execute",
            new=AsyncMock(return_value=analysis_output),
        ):
            with patch.object(
                ambiguity_resolver,
                "resolve",
                new=AsyncMock(return_value=resolver_output),
            ):
                with patch.object(workflow_engine.state_manager, "get", new=AsyncMock(return_value={})):
                    with patch.object(workflow_engine.state_manager, "save", new=AsyncMock()):
                        with patch.object(
                            workflow_engine.event_bus,
                            "publish",
                            side_effect=capture_event,
                        ):
                            with patch.object(workflow_engine.decision_logger, "log", new=AsyncMock()):
                                await workflow_engine.run_analysis("proj-001", sample_brief, "brief")

        # Check that ambiguities_detected event was published
        ambiguity_events = [e for e in published_events if e.event_type == "ambiguities_detected"]
        assert len(ambiguity_events) == 1
        assert ambiguity_events[0].payload["can_proceed"] is True


# ================================================================== #
#  E2E Test: Inactivity Detection Flow                                #
# ================================================================== #

class TestInactivityDetectionFlow:
    """
    Scenario: Risk check runs and detects inactive members.
    Expected: InactivityDetector flags inactive members and triggers event.
    """

    @pytest.mark.asyncio
    async def test_inactive_members_detected_in_risk_check(self, workflow_engine, sample_project_state):
        """Risk check should detect inactive members."""
        
        risk_output = {
            "status": "success",
            "success": True,
            "result": {
                "project_health": "warning",
                "deadline_failure_probability": 0.3,
                "risks": [],
                "auto_recovery_triggered": False,
            },
        }

        inactivity_report = {
            "inactive_members": [
                {"member_id": "m2", "name": "Bob", "days_since_activity": 5, "severity": "critical"}
            ],
            "active_members": ["m1"],
            "redistribution_needed": True,
        }

        published_events = []

        async def capture_event(event):
            published_events.append(event)

        with patch.object(
            workflow_engine._agents["risk_detection"],
            "execute",
            new=AsyncMock(return_value=risk_output),
        ):
            with patch.object(
                inactivity_detector,
                "scan",
                new=AsyncMock(return_value=inactivity_report),
            ):
                with patch.object(workflow_engine.state_manager, "get", new=AsyncMock(return_value=sample_project_state)):
                    with patch.object(workflow_engine.state_manager, "save", new=AsyncMock()):
                        with patch.object(
                            workflow_engine.event_bus,
                            "publish",
                            side_effect=capture_event,
                        ):
                            await workflow_engine.run_risk_check("proj-001")

        # Verify inactivity event was published
        inactivity_events = [e for e in published_events if e.event_type == "inactivity_detected"]
        assert len(inactivity_events) == 1
        assert len(inactivity_events[0].payload["inactive_members"]) == 1
        assert inactivity_events[0].payload["redistribution_needed"] is True


# ================================================================== #
#  E2E Test: Deadline Recovery Flow                                   #
# ================================================================== #

class TestDeadlineRecoveryFlow:
    """
    Scenario: Risk check detects high deadline failure probability.
    Expected: DeadlineRecovery generates recovery plan and publishes event.
    """

    @pytest.mark.asyncio
    async def test_deadline_recovery_triggered_when_risk_high(self, workflow_engine, sample_project_state):
        """When deadline failure probability > 50%, recovery should activate."""
        
        risk_output = {
            "status": "success",
            "success": True,
            "result": {
                "project_health": "critical",
                "deadline_failure_probability": 0.8,  # High risk
                "risks": [{"description": "Behind schedule"}],
                "auto_recovery_triggered": True,
            },
        }

        recovery_plan = {
            "project_id": "proj-001",
            "tasks_to_cut": ["T4"],
            "tasks_to_compress": [{"task_id": "T3", "new_estimated_hours": 5}],
            "priority_order": ["T1", "T2", "T3"],
            "recovery_message": "Cut non-essential tasks, compress others.",
        }

        published_events = []

        async def capture_event(event):
            published_events.append(event)

        with patch.object(
            workflow_engine._agents["risk_detection"],
            "execute",
            new=AsyncMock(return_value=risk_output),
        ):
            with patch.object(
                inactivity_detector,
                "scan",
                new=AsyncMock(return_value={"inactive_members": [], "active_members": ["m1", "m2"], "redistribution_needed": False}),
            ):
                with patch.object(
                    workflow_engine.deadline_recovery,
                    "generate_recovery_plan",
                    new=AsyncMock(return_value=recovery_plan),
                ):
                    with patch.object(workflow_engine.state_manager, "get", new=AsyncMock(return_value=sample_project_state)):
                        with patch.object(workflow_engine.state_manager, "save", new=AsyncMock()):
                            with patch.object(
                                workflow_engine.event_bus,
                                "publish",
                                side_effect=capture_event,
                            ):
                                await workflow_engine.run_risk_check("proj-001")

        # Verify recovery plan event was published
        recovery_events = [e for e in published_events if e.event_type == "recovery_plan_generated"]
        assert len(recovery_events) == 1
        assert recovery_events[0].payload["project_id"] == "proj-001"
        assert "T4" in recovery_events[0].payload["tasks_to_cut"]

    @pytest.mark.asyncio
    async def test_recovery_triggered_event_when_auto_recovery_true(self, workflow_engine, sample_project_state):
        """When auto_recovery_triggered=True, recovery_triggered event should be published."""
        
        risk_output = {
            "status": "success",
            "success": True,
            "result": {
                "project_health": "critical",
                "deadline_failure_probability": 0.9,
                "risks": [],
                "auto_recovery_triggered": True,  # Triggers replanning
            },
        }

        recovery_plan = {
            "project_id": "proj-001",
            "tasks_to_cut": [],
            "tasks_to_compress": [],
            "priority_order": ["T1", "T2"],
            "recovery_message": "Replanning recommended.",
        }

        published_events = []

        async def capture_event(event):
            published_events.append(event)

        with patch.object(
            workflow_engine._agents["risk_detection"],
            "execute",
            new=AsyncMock(return_value=risk_output),
        ):
            with patch.object(
                inactivity_detector,
                "scan",
                new=AsyncMock(return_value={"inactive_members": [], "active_members": [], "redistribution_needed": False}),
            ):
                with patch.object(
                    workflow_engine.deadline_recovery,
                    "generate_recovery_plan",
                    new=AsyncMock(return_value=recovery_plan),
                ):
                    with patch.object(workflow_engine.state_manager, "get", new=AsyncMock(return_value=sample_project_state)):
                        with patch.object(workflow_engine.state_manager, "save", new=AsyncMock()):
                            with patch.object(
                                workflow_engine.event_bus,
                                "publish",
                                side_effect=capture_event,
                            ):
                                await workflow_engine.run_risk_check("proj-001")

        # Verify recovery_triggered event was published
        recovery_triggered = [e for e in published_events if e.event_type == "recovery_triggered"]
        assert len(recovery_triggered) == 1


# ================================================================== #
#  E2E Test: No Edge Cases (Normal Path)                              #
# ================================================================== #

class TestNormalPathNoEdgeCases:
    """
    Scenario: Normal workflow without edge cases.
    Expected: Edge case handlers not called, workflow proceeds normally.
    """

    @pytest.mark.asyncio
    async def test_analysis_without_ambiguities(self, workflow_engine, sample_brief):
        """Analysis with high confidence should not call resolver."""
        
        analysis_output = {
            "status": "success",
            "success": True,
            "result": {
                "structured_goals": [
                    {"goal_id": "G1", "statement": "Build system", "priority": "high"}
                ],
                "grading_priorities": [],
                "ambiguities": [],  # No ambiguities
                "confidence_score": 0.95,  # High confidence
            },
        }

        resolver_called = False

        async def mock_resolve(*args, **kwargs):
            nonlocal resolver_called
            resolver_called = True
            return {}

        with patch.object(
            workflow_engine._agents["instruction_analysis"],
            "execute",
            new=AsyncMock(return_value=analysis_output),
        ):
            with patch.object(
                ambiguity_resolver,
                "resolve",
                side_effect=mock_resolve,
            ):
                with patch.object(workflow_engine.state_manager, "get", new=AsyncMock(return_value={})):
                    with patch.object(workflow_engine.state_manager, "save", new=AsyncMock()):
                        with patch.object(workflow_engine.event_bus, "publish", new=AsyncMock()):
                            with patch.object(workflow_engine.decision_logger, "log", new=AsyncMock()):
                                result = await workflow_engine.run_analysis("proj-001", sample_brief, "brief")

        # Resolver should not be called for high confidence
        assert not resolver_called
        assert result["result"].get("ambiguity_resolution") is None

    @pytest.mark.asyncio
    async def test_risk_check_without_recovery_needed(self, workflow_engine, sample_project_state):
        """Low risk should not trigger recovery."""
        
        risk_output = {
            "status": "success",
            "success": True,
            "result": {
                "project_health": "healthy",
                "deadline_failure_probability": 0.1,  # Low risk
                "risks": [],
                "auto_recovery_triggered": False,
            },
        }

        recovery_called = False

        async def mock_generate_recovery_plan(*args, **kwargs):
            nonlocal recovery_called
            recovery_called = True
            return {}

        with patch.object(
            workflow_engine._agents["risk_detection"],
            "execute",
            new=AsyncMock(return_value=risk_output),
        ):
            with patch.object(
                inactivity_detector,
                "scan",
                new=AsyncMock(return_value={"inactive_members": [], "active_members": [], "redistribution_needed": False}),
            ):
                with patch.object(
                    workflow_engine.deadline_recovery,
                    "generate_recovery_plan",
                    side_effect=mock_generate_recovery_plan,
                ):
                    with patch.object(workflow_engine.state_manager, "get", new=AsyncMock(return_value=sample_project_state)):
                        with patch.object(workflow_engine.state_manager, "save", new=AsyncMock()):
                            with patch.object(workflow_engine.event_bus, "publish", new=AsyncMock()):
                                await workflow_engine.run_risk_check("proj-001")

        # Recovery should not be called for low risk
        assert not recovery_called
