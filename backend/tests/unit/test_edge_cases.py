"""
tests/unit/test_edge_cases.py

Unit tests for all four edge case handlers:
  - AmbiguityResolver
  - MissingDataHandler
  - InactivityDetector
  - DeadlineRecovery

All GLM calls and Redis calls are mocked — no external services needed.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone, timedelta

from edge_cases.ambiguity_resolver import AmbiguityResolver
from edge_cases.missing_data_handler import MissingDataHandler
from edge_cases.inactivity_detector import (
    InactivityDetector,
    INACTIVITY_WARN_DAYS,
    INACTIVITY_CRITICAL_DAYS,
)
from edge_cases.deadline_recovery import DeadlineRecovery


# ================================================================== #
#  Shared helpers                                                      #
# ================================================================== #

def days_ago_iso(days: int) -> str:
    """Return an ISO timestamp string N days in the past."""
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ================================================================== #
#  AmbiguityResolver                                                   #
# ================================================================== #

class TestAmbiguityResolver:

    AMBIGUITIES = [
        {"issue": "Framework not specified",   "suggested_clarification": "Which framework?"},
        {"issue": "Word count is ambiguous",   "suggested_clarification": "Minimum or target?"},
        {"issue": "Submission format unclear", "suggested_clarification": "PDF or ZIP?"},
    ]

    MOCK_GLM_RESPONSE = {
        "clarification_questions": [
            "Which web framework should be used?",
            "Is 3000 words the minimum or target?",
            "Should the submission be a PDF or a ZIP file?",
        ],
        "working_assumptions": [
            {"assumption": "React will be used for the frontend", "confidence": 0.7},
            {"assumption": "3000 words is the minimum",          "confidence": 0.6},
            {"assumption": "PDF format will be accepted",        "confidence": 0.8},
        ],
        "can_proceed": True,
    }

    @pytest.mark.asyncio
    async def test_returns_clarification_questions(self):
        resolver = AmbiguityResolver()
        with patch(
            "edge_cases.ambiguity_resolver.reasoning_engine.reason",
            new=AsyncMock(return_value=self.MOCK_GLM_RESPONSE),
        ):
            result = await resolver.resolve("proj-001", self.AMBIGUITIES, "Project brief text")
        assert len(result["clarification_questions"]) == 3

    @pytest.mark.asyncio
    async def test_returns_working_assumptions(self):
        resolver = AmbiguityResolver()
        with patch(
            "edge_cases.ambiguity_resolver.reasoning_engine.reason",
            new=AsyncMock(return_value=self.MOCK_GLM_RESPONSE),
        ):
            result = await resolver.resolve("proj-001", self.AMBIGUITIES, "Brief")
        assert len(result["working_assumptions"]) == 3
        assert all("assumption" in a for a in result["working_assumptions"])

    @pytest.mark.asyncio
    async def test_can_proceed_true_when_glm_says_so(self):
        resolver = AmbiguityResolver()
        with patch(
            "edge_cases.ambiguity_resolver.reasoning_engine.reason",
            new=AsyncMock(return_value=self.MOCK_GLM_RESPONSE),
        ):
            result = await resolver.resolve("proj-001", self.AMBIGUITIES, "Brief")
        assert result["can_proceed"] is True

    @pytest.mark.asyncio
    async def test_can_proceed_false_when_glm_says_so(self):
        resolver = AmbiguityResolver()
        blocked = {**self.MOCK_GLM_RESPONSE, "can_proceed": False}
        with patch(
            "edge_cases.ambiguity_resolver.reasoning_engine.reason",
            new=AsyncMock(return_value=blocked),
        ):
            result = await resolver.resolve("proj-001", self.AMBIGUITIES, "Brief")
        assert result["can_proceed"] is False

    @pytest.mark.asyncio
    async def test_ambiguity_count_matches_input(self):
        resolver = AmbiguityResolver()
        with patch(
            "edge_cases.ambiguity_resolver.reasoning_engine.reason",
            new=AsyncMock(return_value=self.MOCK_GLM_RESPONSE),
        ):
            result = await resolver.resolve("proj-001", self.AMBIGUITIES, "Brief")
        assert result["ambiguity_count"] == len(self.AMBIGUITIES)

    @pytest.mark.asyncio
    async def test_empty_ambiguities_list(self):
        resolver = AmbiguityResolver()
        empty_response = {
            "clarification_questions": [],
            "working_assumptions": [],
            "can_proceed": True,
        }
        with patch(
            "edge_cases.ambiguity_resolver.reasoning_engine.reason",
            new=AsyncMock(return_value=empty_response),
        ):
            result = await resolver.resolve("proj-001", [], "Brief")
        assert result["clarification_questions"] == []
        assert result["can_proceed"] is True
        assert result["ambiguity_count"] == 0

    @pytest.mark.asyncio
    async def test_document_text_truncated_to_2000_chars(self):
        """Verify that long documents don't cause context overflow."""
        resolver = AmbiguityResolver()
        long_text = "x" * 5000
        captured_context = {}

        async def capture_reason(prompt_template, context, **kwargs):
            captured_context.update(context)
            return self.MOCK_GLM_RESPONSE

        with patch("edge_cases.ambiguity_resolver.reasoning_engine.reason", new=capture_reason):
            await resolver.resolve("proj-001", self.AMBIGUITIES, long_text)

        assert len(captured_context["document_excerpt"]) == 2000

    @pytest.mark.asyncio
    async def test_missing_keys_in_glm_response_handled_gracefully(self):
        resolver = AmbiguityResolver()
        incomplete = {}  # GLM returned nothing useful
        with patch(
            "edge_cases.ambiguity_resolver.reasoning_engine.reason",
            new=AsyncMock(return_value=incomplete),
        ):
            result = await resolver.resolve("proj-001", self.AMBIGUITIES, "Brief")
        assert result["clarification_questions"] == []
        assert result["working_assumptions"] == []
        assert result["can_proceed"] is True  # safe default

    def test_build_assumption_log_formats_correctly(self):
        resolver = AmbiguityResolver()
        assumptions = [
            {"assumption": "React used", "confidence": 0.7},
            {"assumption": "PDF format", "confidence": 0.8},
        ]
        log = resolver.build_assumption_log(assumptions)
        assert "Working Assumptions:" in log
        assert "React used" in log
        assert "0.7" in log
        assert "PDF format" in log

    def test_build_assumption_log_empty_list(self):
        resolver = AmbiguityResolver()
        log = resolver.build_assumption_log([])
        assert "Working Assumptions:" in log


# ================================================================== #
#  MissingDataHandler                                                  #
# ================================================================== #

class TestMissingDataHandler:

    def test_fills_missing_deadline(self):
        handler = MissingDataHandler()
        ctx = {"project_id": "p1"}
        filled = handler.fill_defaults(ctx)
        assert "deadline_date" in filled
        assert filled["deadline_date"] == "14 days from today"

    def test_fills_missing_team_size(self):
        handler = MissingDataHandler()
        ctx = {"project_id": "p1"}
        filled = handler.fill_defaults(ctx)
        assert filled["team_size"] == 3

    def test_fills_missing_document_type(self):
        handler = MissingDataHandler()
        ctx = {"project_id": "p1"}
        filled = handler.fill_defaults(ctx)
        assert filled["document_type"] == "brief"

    def test_fills_missing_rubric_criteria(self):
        handler = MissingDataHandler()
        ctx = {"project_id": "p1"}
        filled = handler.fill_defaults(ctx)
        assert filled["rubric_criteria"] == []

    def test_fills_missing_members(self):
        handler = MissingDataHandler()
        ctx = {"project_id": "p1"}
        filled = handler.fill_defaults(ctx)
        assert filled["members"] == []

    def test_does_not_overwrite_existing_values(self):
        handler = MissingDataHandler()
        ctx = {
            "project_id": "p1",
            "deadline_date": "2025-12-01",
            "team_size": 5,
        }
        filled = handler.fill_defaults(ctx)
        assert filled["deadline_date"] == "2025-12-01"
        assert filled["team_size"] == 5

    def test_none_values_are_replaced(self):
        handler = MissingDataHandler()
        ctx = {"project_id": "p1", "deadline_date": None, "team_size": None}
        filled = handler.fill_defaults(ctx)
        assert filled["deadline_date"] == "14 days from today"
        assert filled["team_size"] == 3

    def test_filled_defaults_key_tracks_what_was_filled(self):
        handler = MissingDataHandler()
        ctx = {"project_id": "p1", "deadline_date": "2025-12-01"}
        filled = handler.fill_defaults(ctx)
        assert "deadline_date" not in filled["_filled_defaults"]
        assert "team_size" in filled["_filled_defaults"]

    def test_completeness_score_is_1_when_all_provided(self):
        handler = MissingDataHandler()
        ctx = {
            "deadline_date": "2025-12-01",
            "team_size": 4,
            "document_type": "rubric",
            "rubric_criteria": [{"criterion": "X"}],
            "members": [{"id": "m1"}],
        }
        filled = handler.fill_defaults(ctx)
        assert filled["_data_completeness"] == 1.0

    def test_completeness_score_is_0_when_all_missing(self):
        handler = MissingDataHandler()
        ctx = {}
        filled = handler.fill_defaults(ctx)
        assert filled["_data_completeness"] == 0.0

    def test_completeness_score_is_between_0_and_1(self):
        handler = MissingDataHandler()
        ctx = {"deadline_date": "2025-12-01"}  # 1 of 5 fields provided
        filled = handler.fill_defaults(ctx)
        assert 0.0 <= filled["_data_completeness"] <= 1.0

    def test_uncertainty_flags_for_missing_deadline(self):
        handler = MissingDataHandler()
        flags = handler.get_uncertainty_flags(["deadline_date"])
        assert len(flags) == 1
        assert "deadline" in flags[0].lower()

    def test_uncertainty_flags_for_missing_rubric(self):
        handler = MissingDataHandler()
        flags = handler.get_uncertainty_flags(["rubric_criteria"])
        assert any("rubric" in f.lower() for f in flags)

    def test_uncertainty_flags_for_missing_members(self):
        handler = MissingDataHandler()
        flags = handler.get_uncertainty_flags(["members"])
        assert any("member" in f.lower() or "team" in f.lower() for f in flags)

    def test_uncertainty_flags_empty_when_no_filled_keys(self):
        handler = MissingDataHandler()
        flags = handler.get_uncertainty_flags([])
        assert flags == []

    def test_uncertainty_flags_skips_unknown_keys(self):
        """Non-message keys should not cause errors."""
        handler = MissingDataHandler()
        flags = handler.get_uncertainty_flags(["some_unknown_field"])
        assert flags == []

    def test_multiple_missing_fields_all_filled(self):
        handler = MissingDataHandler()
        ctx = {"project_id": "p1"}
        filled = handler.fill_defaults(ctx)
        defaults = handler.SAFE_DEFAULTS
        for key in defaults:
            assert key in filled


# ================================================================== #
#  InactivityDetector                                                  #
# ================================================================== #

class TestInactivityDetector:

    MEMBERS = [
        {"id": "m1", "name": "Alice"},
        {"id": "m2", "name": "Bob"},
        {"id": "m3", "name": "Carol"},
    ]

    @pytest.mark.asyncio
    async def test_all_active_no_inactive_members(self):
        detector = InactivityDetector()
        ts = now_iso()
        with patch(
            "edge_cases.inactivity_detector.activity_tracker.get_member_last_activity",
            new=AsyncMock(return_value=ts),
        ):
            result = await detector.scan("p1", self.MEMBERS)
        assert result["inactive_members"] == []
        assert len(result["active_members"]) == 3

    @pytest.mark.asyncio
    async def test_inactive_member_detected_at_warn_level(self):
        detector = InactivityDetector()
        warn_ts = days_ago_iso(INACTIVITY_WARN_DAYS)
        active_ts = now_iso()

        async def mock_last(project_id, member_id):
            return warn_ts if member_id == "m1" else active_ts

        with patch(
            "edge_cases.inactivity_detector.activity_tracker.get_member_last_activity",
            side_effect=mock_last,
        ):
            result = await detector.scan("p1", self.MEMBERS)

        inactive_ids = [m["member_id"] for m in result["inactive_members"]]
        assert "m1" in inactive_ids
        m1 = next(m for m in result["inactive_members"] if m["member_id"] == "m1")
        assert m1["severity"] == "warn"

    @pytest.mark.asyncio
    async def test_inactive_member_detected_at_critical_level(self):
        detector = InactivityDetector()
        critical_ts = days_ago_iso(INACTIVITY_CRITICAL_DAYS)
        active_ts = now_iso()

        async def mock_last(project_id, member_id):
            return critical_ts if member_id == "m2" else active_ts

        with patch(
            "edge_cases.inactivity_detector.activity_tracker.get_member_last_activity",
            side_effect=mock_last,
        ):
            result = await detector.scan("p1", self.MEMBERS)

        m2 = next(m for m in result["inactive_members"] if m["member_id"] == "m2")
        assert m2["severity"] == "critical"

    @pytest.mark.asyncio
    async def test_redistribution_needed_only_for_critical(self):
        detector = InactivityDetector()
        warn_ts = days_ago_iso(INACTIVITY_WARN_DAYS)

        with patch(
            "edge_cases.inactivity_detector.activity_tracker.get_member_last_activity",
            new=AsyncMock(return_value=warn_ts),
        ):
            result = await detector.scan("p1", [{"id": "m1", "name": "Alice"}])

        # Warn-level should not trigger redistribution
        assert result["redistribution_needed"] is False

    @pytest.mark.asyncio
    async def test_redistribution_needed_true_for_critical(self):
        detector = InactivityDetector()
        critical_ts = days_ago_iso(INACTIVITY_CRITICAL_DAYS)

        with patch(
            "edge_cases.inactivity_detector.activity_tracker.get_member_last_activity",
            new=AsyncMock(return_value=critical_ts),
        ):
            result = await detector.scan("p1", [{"id": "m1", "name": "Alice"}])

        assert result["redistribution_needed"] is True

    @pytest.mark.asyncio
    async def test_member_with_no_activity_history_treated_as_inactive(self):
        """Member who has never done anything → last_activity = None → treated as 999 days."""
        detector = InactivityDetector()
        with patch(
            "edge_cases.inactivity_detector.activity_tracker.get_member_last_activity",
            new=AsyncMock(return_value=None),
        ):
            result = await detector.scan("p1", [{"id": "m1", "name": "Alice"}])

        m1 = next(m for m in result["inactive_members"] if m["member_id"] == "m1")
        assert m1["days_since_activity"] == 999
        assert m1["severity"] == "critical"

    @pytest.mark.asyncio
    async def test_active_members_list_correct(self):
        detector = InactivityDetector()
        active_ts = now_iso()
        old_ts = days_ago_iso(INACTIVITY_CRITICAL_DAYS + 1)

        async def mock_last(project_id, member_id):
            return old_ts if member_id == "m3" else active_ts

        with patch(
            "edge_cases.inactivity_detector.activity_tracker.get_member_last_activity",
            side_effect=mock_last,
        ):
            result = await detector.scan("p1", self.MEMBERS)

        assert "m1" in result["active_members"]
        assert "m2" in result["active_members"]
        assert "m3" not in result["active_members"]

    @pytest.mark.asyncio
    async def test_empty_members_list(self):
        detector = InactivityDetector()
        result = await detector.scan("p1", [])
        assert result["inactive_members"] == []
        assert result["active_members"] == []
        assert result["redistribution_needed"] is False

    @pytest.mark.asyncio
    async def test_supports_member_id_or_id_key(self):
        """Member dicts may use either 'id' or 'member_id' key."""
        detector = InactivityDetector()
        members_alt = [{"member_id": "m1", "name": "Alice"}]
        with patch(
            "edge_cases.inactivity_detector.activity_tracker.get_member_last_activity",
            new=AsyncMock(return_value=now_iso()),
        ):
            result = await detector.scan("p1", members_alt)
        assert "m1" in result["active_members"]

    @pytest.mark.asyncio
    async def test_mixed_severity_multiple_members(self):
        detector = InactivityDetector()
        timestamps = {
            "m1": days_ago_iso(INACTIVITY_CRITICAL_DAYS + 1),  # critical
            "m2": days_ago_iso(INACTIVITY_WARN_DAYS),           # warn
            "m3": now_iso(),                                     # active
        }

        async def mock_last(project_id, member_id):
            return timestamps[member_id]

        with patch(
            "edge_cases.inactivity_detector.activity_tracker.get_member_last_activity",
            side_effect=mock_last,
        ):
            result = await detector.scan("p1", self.MEMBERS)

        severities = {m["member_id"]: m["severity"] for m in result["inactive_members"]}
        assert severities["m1"] == "critical"
        assert severities["m2"] == "warn"
        assert "m3" not in severities
        assert result["redistribution_needed"] is True  # because m1 is critical


# ================================================================== #
#  DeadlineRecovery                                                    #
# ================================================================== #

class TestDeadlineRecovery:

    TASKS = [
        {"task_id": "T1", "title": "DB schema",    "status": "done",        "priority": "critical", "estimated_hours": 3},
        {"task_id": "T2", "title": "API build",    "status": "in_progress", "priority": "high",     "estimated_hours": 6},
        {"task_id": "T3", "title": "GLM hookup",   "status": "pending",     "priority": "critical", "estimated_hours": 8},
        {"task_id": "T4", "title": "Write report", "status": "pending",     "priority": "low",      "estimated_hours": 4},
    ]

    RISK_REPORT = {
        "deadline_failure_probability": 0.78,
        "recovery_actions": [
            {"action_id": "A1", "description": "Cut T4", "target": "task", "priority": "immediate"},
        ],
    }

    MOCK_RECOVERY_PLAN = {
        "tasks_to_cut": ["T4"],
        "tasks_to_compress": [
            {"task_id": "T3", "new_estimated_hours": 5},
        ],
        "priority_order": ["T3", "T2", "T1", "T4"],
        "recovery_message": "Cut report writing, compress GLM integration to 5 hours.",
    }

    @pytest.mark.asyncio
    async def test_returns_tasks_to_cut(self):
        recovery = DeadlineRecovery()
        with patch(
            "edge_cases.deadline_recovery.reasoning_engine.reason",
            new=AsyncMock(return_value=self.MOCK_RECOVERY_PLAN),
        ):
            result = await recovery.generate_recovery_plan(
                project_id="p1",
                tasks=self.TASKS,
                deadline_date="2025-12-01",
                current_date="2025-11-28",
                risk_report=self.RISK_REPORT,
            )
        assert "T4" in result["tasks_to_cut"]

    @pytest.mark.asyncio
    async def test_returns_tasks_to_compress(self):
        recovery = DeadlineRecovery()
        with patch(
            "edge_cases.deadline_recovery.reasoning_engine.reason",
            new=AsyncMock(return_value=self.MOCK_RECOVERY_PLAN),
        ):
            result = await recovery.generate_recovery_plan(
                project_id="p1",
                tasks=self.TASKS,
                deadline_date="2025-12-01",
                current_date="2025-11-28",
                risk_report=self.RISK_REPORT,
            )
        assert len(result["tasks_to_compress"]) == 1
        assert result["tasks_to_compress"][0]["task_id"] == "T3"
        assert result["tasks_to_compress"][0]["new_estimated_hours"] == 5

    @pytest.mark.asyncio
    async def test_returns_priority_order(self):
        recovery = DeadlineRecovery()
        with patch(
            "edge_cases.deadline_recovery.reasoning_engine.reason",
            new=AsyncMock(return_value=self.MOCK_RECOVERY_PLAN),
        ):
            result = await recovery.generate_recovery_plan(
                project_id="p1",
                tasks=self.TASKS,
                deadline_date="2025-12-01",
                current_date="2025-11-28",
                risk_report=self.RISK_REPORT,
            )
        assert result["priority_order"] == ["T3", "T2", "T1", "T4"]

    @pytest.mark.asyncio
    async def test_returns_recovery_message(self):
        recovery = DeadlineRecovery()
        with patch(
            "edge_cases.deadline_recovery.reasoning_engine.reason",
            new=AsyncMock(return_value=self.MOCK_RECOVERY_PLAN),
        ):
            result = await recovery.generate_recovery_plan(
                project_id="p1",
                tasks=self.TASKS,
                deadline_date="2025-12-01",
                current_date="2025-11-28",
                risk_report=self.RISK_REPORT,
            )
        assert isinstance(result["recovery_message"], str)
        assert len(result["recovery_message"]) > 0

    @pytest.mark.asyncio
    async def test_project_id_included_in_output(self):
        recovery = DeadlineRecovery()
        with patch(
            "edge_cases.deadline_recovery.reasoning_engine.reason",
            new=AsyncMock(return_value=self.MOCK_RECOVERY_PLAN),
        ):
            result = await recovery.generate_recovery_plan(
                project_id="proj-xyz",
                tasks=self.TASKS,
                deadline_date="2025-12-01",
                current_date="2025-11-28",
                risk_report=self.RISK_REPORT,
            )
        assert result["project_id"] == "proj-xyz"

    @pytest.mark.asyncio
    async def test_glm_returns_empty_plan_handled(self):
        """If GLM gives no tasks_to_cut / compress, defaults to empty lists."""
        recovery = DeadlineRecovery()
        empty_plan = {"recovery_message": "No changes needed."}
        with patch(
            "edge_cases.deadline_recovery.reasoning_engine.reason",
            new=AsyncMock(return_value=empty_plan),
        ):
            result = await recovery.generate_recovery_plan(
                project_id="p1",
                tasks=self.TASKS,
                deadline_date="2025-12-01",
                current_date="2025-11-28",
                risk_report=self.RISK_REPORT,
            )
        assert result["tasks_to_cut"] == []
        assert result["tasks_to_compress"] == []
        assert result["priority_order"] == []
        assert result["recovery_message"] == "No changes needed."

    @pytest.mark.asyncio
    async def test_failure_probability_passed_to_glm(self):
        """Verify risk context is forwarded correctly to GLM."""
        recovery = DeadlineRecovery()
        captured = {}

        async def capture_reason(prompt_template, context, **kwargs):
            captured.update(context)
            return self.MOCK_RECOVERY_PLAN

        with patch("edge_cases.deadline_recovery.reasoning_engine.reason", new=capture_reason):
            await recovery.generate_recovery_plan(
                project_id="p1",
                tasks=self.TASKS,
                deadline_date="2025-12-01",
                current_date="2025-11-28",
                risk_report=self.RISK_REPORT,
            )

        assert captured["failure_probability"] == 0.78
        assert captured["deadline_date"] == "2025-12-01"
        assert captured["current_date"] == "2025-11-28"

    @pytest.mark.asyncio
    async def test_all_tasks_forwarded_to_glm(self):
        recovery = DeadlineRecovery()
        captured = {}

        async def capture_reason(prompt_template, context, **kwargs):
            captured.update(context)
            return self.MOCK_RECOVERY_PLAN

        with patch("edge_cases.deadline_recovery.reasoning_engine.reason", new=capture_reason):
            await recovery.generate_recovery_plan(
                project_id="p1",
                tasks=self.TASKS,
                deadline_date="2025-12-01",
                current_date="2025-11-28",
                risk_report=self.RISK_REPORT,
            )

        assert len(captured["tasks"]) == 4

    @pytest.mark.asyncio
    async def test_empty_task_list_does_not_crash(self):
        recovery = DeadlineRecovery()
        with patch(
            "edge_cases.deadline_recovery.reasoning_engine.reason",
            new=AsyncMock(return_value=self.MOCK_RECOVERY_PLAN),
        ):
            result = await recovery.generate_recovery_plan(
                project_id="p1",
                tasks=[],
                deadline_date="2025-12-01",
                current_date="2025-11-28",
                risk_report=self.RISK_REPORT,
            )
        assert "project_id" in result
