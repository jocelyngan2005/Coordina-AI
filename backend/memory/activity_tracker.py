"""
memory/activity_tracker.py

Tracks member contribution events over time.
Used by RiskDetectionAgent and CoordinationAgent to assess participation.
"""

import json
from datetime import datetime, timezone
from typing import Any

from core.redis_client import get_redis

ACTIVITY_KEY_PREFIX = "project:activity:"
MAX_EVENTS = 500


class ActivityTracker:
    def _key(self, project_id: str) -> str:
        return f"{ACTIVITY_KEY_PREFIX}{project_id}"

    async def record(
        self,
        project_id: str,
        member_id: str,
        activity_type: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """
        Record a member activity event.
        activity_type examples: "task_updated", "message_sent",
                                "file_uploaded", "task_completed"
        """
        event = {
            "member_id": member_id,
            "activity_type": activity_type,
            "metadata": metadata or {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        redis = get_redis()
        key = self._key(project_id)
        await redis.rpush(key, json.dumps(event, ensure_ascii=False))
        await redis.ltrim(key, -MAX_EVENTS, -1)

    async def get_history(self, project_id: str, limit: int = 50) -> list[dict]:
        redis = get_redis()
        raw = await redis.lrange(self._key(project_id), -limit, -1)
        return [json.loads(e) for e in raw]

    async def get_member_last_activity(
        self, project_id: str, member_id: str
    ) -> str | None:
        """Return ISO timestamp of the member's most recent activity, or None."""
        history = await self.get_history(project_id, limit=MAX_EVENTS)
        for event in reversed(history):
            if event["member_id"] == member_id:
                return event["timestamp"]
        return None

    async def get_contribution_counts(self, project_id: str) -> dict[str, int]:
        """Return a dict of {member_id: event_count} for all members."""
        history = await self.get_history(project_id, limit=MAX_EVENTS)
        counts: dict[str, int] = {}
        for event in history:
            mid = event["member_id"]
            counts[mid] = counts.get(mid, 0) + 1
        return counts


activity_tracker = ActivityTracker()