"""
tests/unit/test_memory.py

Unit tests for the memory layer:
  - DecisionLogger
  - ActivityTracker
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call
from datetime import datetime, timezone

from memory.decision_log import DecisionLogger, MAX_LOG_ENTRIES
from memory.activity_tracker import ActivityTracker, MAX_EVENTS


# ================================================================== #
#  Helpers                                                             #
# ================================================================== #

def make_mock_redis():
    """Return an async-compatible Redis mock."""
    mock = MagicMock()
    mock.rpush = AsyncMock(return_value=1)
    mock.ltrim = AsyncMock(return_value=True)
    mock.lrange = AsyncMock(return_value=[])
    mock.get = AsyncMock(return_value=None)
    mock.set = AsyncMock(return_value=True)
    return mock


# ================================================================== #
#  DecisionLogger                                                      #
# ================================================================== #

class TestDecisionLogger:

    @pytest.mark.asyncio
    async def test_log_calls_rpush(self):
        logger = DecisionLogger()
        mock_redis = make_mock_redis()
        with patch("memory.decision_log.get_redis", return_value=mock_redis):
            await logger.log("proj-1", "planning", "Generated 3 tasks", {"tasks": []})
        mock_redis.rpush.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_log_uses_correct_key_prefix(self):
        logger = DecisionLogger()
        mock_redis = make_mock_redis()
        with patch("memory.decision_log.get_redis", return_value=mock_redis):
            await logger.log("proj-abc", "risk_detection", "Risk found", {})
        key_used = mock_redis.rpush.call_args[0][0]
        assert "proj-abc" in key_used

    @pytest.mark.asyncio
    async def test_log_entry_contains_agent_name(self):
        logger = DecisionLogger()
        mock_redis = make_mock_redis()
        with patch("memory.decision_log.get_redis", return_value=mock_redis):
            await logger.log("proj-1", "coordination", "Assigned roles", {})
        raw_entry = mock_redis.rpush.call_args[0][1]
        entry = json.loads(raw_entry)
        assert entry["agent"] == "coordination"

    @pytest.mark.asyncio
    async def test_log_entry_contains_summary(self):
        logger = DecisionLogger()
        mock_redis = make_mock_redis()
        with patch("memory.decision_log.get_redis", return_value=mock_redis):
            await logger.log("proj-1", "planning", "Generated 5 tasks", {})
        raw_entry = mock_redis.rpush.call_args[0][1]
        entry = json.loads(raw_entry)
        assert entry["summary"] == "Generated 5 tasks"

    @pytest.mark.asyncio
    async def test_log_entry_contains_output(self):
        logger = DecisionLogger()
        mock_redis = make_mock_redis()
        payload = {"tasks": [{"task_id": "T1"}]}
        with patch("memory.decision_log.get_redis", return_value=mock_redis):
            await logger.log("proj-1", "planning", "Summary", payload)
        raw_entry = mock_redis.rpush.call_args[0][1]
        entry = json.loads(raw_entry)
        assert entry["output"] == payload

    @pytest.mark.asyncio
    async def test_log_entry_has_timestamp(self):
        logger = DecisionLogger()
        mock_redis = make_mock_redis()
        with patch("memory.decision_log.get_redis", return_value=mock_redis):
            await logger.log("proj-1", "analysis", "Parsed brief", {})
        raw_entry = mock_redis.rpush.call_args[0][1]
        entry = json.loads(raw_entry)
        assert "logged_at" in entry
        # Should be a valid ISO timestamp
        datetime.fromisoformat(entry["logged_at"])

    @pytest.mark.asyncio
    async def test_log_calls_ltrim_to_cap_entries(self):
        logger = DecisionLogger()
        mock_redis = make_mock_redis()
        with patch("memory.decision_log.get_redis", return_value=mock_redis):
            await logger.log("proj-1", "planning", "Summary", {})
        mock_redis.ltrim.assert_awaited_once()
        ltrim_args = mock_redis.ltrim.call_args[0]
        assert ltrim_args[1] == -MAX_LOG_ENTRIES
        assert ltrim_args[2] == -1

    @pytest.mark.asyncio
    async def test_get_all_returns_parsed_entries(self):
        logger = DecisionLogger()
        entries = [
            json.dumps({"agent": "planning", "summary": "Created tasks", "output": {}, "logged_at": "2025-11-01T00:00:00Z"}),
            json.dumps({"agent": "risk_detection", "summary": "No risks", "output": {}, "logged_at": "2025-11-02T00:00:00Z"}),
        ]
        mock_redis = make_mock_redis()
        mock_redis.lrange = AsyncMock(return_value=entries)
        with patch("memory.decision_log.get_redis", return_value=mock_redis):
            result = await logger.get_all("proj-1")
        assert len(result) == 2
        assert result[0]["agent"] == "planning"
        assert result[1]["agent"] == "risk_detection"

    @pytest.mark.asyncio
    async def test_get_all_returns_empty_list_when_no_entries(self):
        logger = DecisionLogger()
        mock_redis = make_mock_redis()
        mock_redis.lrange = AsyncMock(return_value=[])
        with patch("memory.decision_log.get_redis", return_value=mock_redis):
            result = await logger.get_all("proj-1")
        assert result == []

    @pytest.mark.asyncio
    async def test_get_recent_requests_correct_range(self):
        logger = DecisionLogger()
        mock_redis = make_mock_redis()
        mock_redis.lrange = AsyncMock(return_value=[])
        with patch("memory.decision_log.get_redis", return_value=mock_redis):
            await logger.get_recent("proj-1", n=5)
        lrange_args = mock_redis.lrange.call_args[0]
        assert lrange_args[1] == -5
        assert lrange_args[2] == -1

    @pytest.mark.asyncio
    async def test_get_recent_default_is_10(self):
        logger = DecisionLogger()
        mock_redis = make_mock_redis()
        mock_redis.lrange = AsyncMock(return_value=[])
        with patch("memory.decision_log.get_redis", return_value=mock_redis):
            await logger.get_recent("proj-1")
        lrange_args = mock_redis.lrange.call_args[0]
        assert lrange_args[1] == -10

    @pytest.mark.asyncio
    async def test_key_is_different_per_project(self):
        logger = DecisionLogger()
        key1 = logger._key("project-A")
        key2 = logger._key("project-B")
        assert key1 != key2
        assert "project-A" in key1
        assert "project-B" in key2


# ================================================================== #
#  ActivityTracker                                                     #
# ================================================================== #

class TestActivityTracker:

    @pytest.mark.asyncio
    async def test_record_calls_rpush(self):
        tracker = ActivityTracker()
        mock_redis = make_mock_redis()
        with patch("memory.activity_tracker.get_redis", return_value=mock_redis):
            await tracker.record("proj-1", "m1", "task_updated")
        mock_redis.rpush.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_record_event_contains_member_id(self):
        tracker = ActivityTracker()
        mock_redis = make_mock_redis()
        with patch("memory.activity_tracker.get_redis", return_value=mock_redis):
            await tracker.record("proj-1", "m1", "file_uploaded")
        raw = mock_redis.rpush.call_args[0][1]
        event = json.loads(raw)
        assert event["member_id"] == "m1"

    @pytest.mark.asyncio
    async def test_record_event_contains_activity_type(self):
        tracker = ActivityTracker()
        mock_redis = make_mock_redis()
        with patch("memory.activity_tracker.get_redis", return_value=mock_redis):
            await tracker.record("proj-1", "m2", "task_completed")
        raw = mock_redis.rpush.call_args[0][1]
        event = json.loads(raw)
        assert event["activity_type"] == "task_completed"

    @pytest.mark.asyncio
    async def test_record_event_has_timestamp(self):
        tracker = ActivityTracker()
        mock_redis = make_mock_redis()
        with patch("memory.activity_tracker.get_redis", return_value=mock_redis):
            await tracker.record("proj-1", "m1", "message_sent")
        raw = mock_redis.rpush.call_args[0][1]
        event = json.loads(raw)
        assert "timestamp" in event
        datetime.fromisoformat(event["timestamp"])

    @pytest.mark.asyncio
    async def test_record_event_includes_metadata(self):
        tracker = ActivityTracker()
        mock_redis = make_mock_redis()
        metadata = {"task_id": "T1", "completion_pct": 75}
        with patch("memory.activity_tracker.get_redis", return_value=mock_redis):
            await tracker.record("proj-1", "m1", "task_updated", metadata)
        raw = mock_redis.rpush.call_args[0][1]
        event = json.loads(raw)
        assert event["metadata"]["task_id"] == "T1"
        assert event["metadata"]["completion_pct"] == 75

    @pytest.mark.asyncio
    async def test_record_metadata_defaults_to_empty_dict(self):
        tracker = ActivityTracker()
        mock_redis = make_mock_redis()
        with patch("memory.activity_tracker.get_redis", return_value=mock_redis):
            await tracker.record("proj-1", "m1", "member_joined")
        raw = mock_redis.rpush.call_args[0][1]
        event = json.loads(raw)
        assert event["metadata"] == {}

    @pytest.mark.asyncio
    async def test_record_calls_ltrim_to_cap_events(self):
        tracker = ActivityTracker()
        mock_redis = make_mock_redis()
        with patch("memory.activity_tracker.get_redis", return_value=mock_redis):
            await tracker.record("proj-1", "m1", "task_updated")
        mock_redis.ltrim.assert_awaited_once()
        ltrim_args = mock_redis.ltrim.call_args[0]
        assert ltrim_args[1] == -MAX_EVENTS

    @pytest.mark.asyncio
    async def test_get_history_returns_parsed_events(self):
        tracker = ActivityTracker()
        events = [
            json.dumps({"member_id": "m1", "activity_type": "task_updated", "metadata": {}, "timestamp": "2025-11-01T10:00:00Z"}),
            json.dumps({"member_id": "m2", "activity_type": "file_uploaded", "metadata": {}, "timestamp": "2025-11-01T11:00:00Z"}),
        ]
        mock_redis = make_mock_redis()
        mock_redis.lrange = AsyncMock(return_value=events)
        with patch("memory.activity_tracker.get_redis", return_value=mock_redis):
            result = await tracker.get_history("proj-1")
        assert len(result) == 2
        assert result[0]["member_id"] == "m1"

    @pytest.mark.asyncio
    async def test_get_history_returns_empty_list_when_no_events(self):
        tracker = ActivityTracker()
        mock_redis = make_mock_redis()
        mock_redis.lrange = AsyncMock(return_value=[])
        with patch("memory.activity_tracker.get_redis", return_value=mock_redis):
            result = await tracker.get_history("proj-1")
        assert result == []

    @pytest.mark.asyncio
    async def test_get_member_last_activity_returns_timestamp(self):
        tracker = ActivityTracker()
        events = [
            json.dumps({"member_id": "m1", "activity_type": "task_updated", "metadata": {}, "timestamp": "2025-11-01T10:00:00Z"}),
            json.dumps({"member_id": "m2", "activity_type": "file_uploaded", "metadata": {}, "timestamp": "2025-11-01T11:00:00Z"}),
            json.dumps({"member_id": "m1", "activity_type": "message_sent",  "metadata": {}, "timestamp": "2025-11-01T12:00:00Z"}),
        ]
        mock_redis = make_mock_redis()
        mock_redis.lrange = AsyncMock(return_value=events)
        with patch("memory.activity_tracker.get_redis", return_value=mock_redis):
            result = await tracker.get_member_last_activity("proj-1", "m1")
        # Should return the MOST RECENT timestamp for m1
        assert result == "2025-11-01T12:00:00Z"

    @pytest.mark.asyncio
    async def test_get_member_last_activity_returns_none_if_no_events(self):
        tracker = ActivityTracker()
        mock_redis = make_mock_redis()
        mock_redis.lrange = AsyncMock(return_value=[])
        with patch("memory.activity_tracker.get_redis", return_value=mock_redis):
            result = await tracker.get_member_last_activity("proj-1", "m99")
        assert result is None

    @pytest.mark.asyncio
    async def test_get_member_last_activity_returns_none_for_unknown_member(self):
        tracker = ActivityTracker()
        events = [
            json.dumps({"member_id": "m1", "activity_type": "task_updated", "metadata": {}, "timestamp": "2025-11-01T10:00:00Z"}),
        ]
        mock_redis = make_mock_redis()
        mock_redis.lrange = AsyncMock(return_value=events)
        with patch("memory.activity_tracker.get_redis", return_value=mock_redis):
            result = await tracker.get_member_last_activity("proj-1", "m999")
        assert result is None

    @pytest.mark.asyncio
    async def test_get_contribution_counts_counts_per_member(self):
        tracker = ActivityTracker()
        events = [
            json.dumps({"member_id": "m1", "activity_type": "task_updated", "metadata": {}, "timestamp": ""}),
            json.dumps({"member_id": "m1", "activity_type": "message_sent",  "metadata": {}, "timestamp": ""}),
            json.dumps({"member_id": "m2", "activity_type": "file_uploaded", "metadata": {}, "timestamp": ""}),
            json.dumps({"member_id": "m1", "activity_type": "task_completed","metadata": {}, "timestamp": ""}),
        ]
        mock_redis = make_mock_redis()
        mock_redis.lrange = AsyncMock(return_value=events)
        with patch("memory.activity_tracker.get_redis", return_value=mock_redis):
            counts = await tracker.get_contribution_counts("proj-1")
        assert counts["m1"] == 3
        assert counts["m2"] == 1

    @pytest.mark.asyncio
    async def test_get_contribution_counts_empty_history(self):
        tracker = ActivityTracker()
        mock_redis = make_mock_redis()
        mock_redis.lrange = AsyncMock(return_value=[])
        with patch("memory.activity_tracker.get_redis", return_value=mock_redis):
            counts = await tracker.get_contribution_counts("proj-1")
        assert counts == {}

    @pytest.mark.asyncio
    async def test_key_is_different_per_project(self):
        tracker = ActivityTracker()
        assert tracker._key("proj-A") != tracker._key("proj-B")
        assert "proj-A" in tracker._key("proj-A")
