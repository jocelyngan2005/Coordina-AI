"""
edge_cases/inactivity_detector.py

Detects member inactivity and triggers workload redistribution.
"""

from datetime import datetime, timezone, timedelta
from typing import Any

from memory.activity_tracker import activity_tracker
from core.logger import logger

INACTIVITY_WARN_DAYS = 2
INACTIVITY_CRITICAL_DAYS = 4


class InactivityDetector:
    """
    Checks all project members against their last activity timestamp.
    Returns tiered alerts: warn | critical | none.
    """

    async def scan(self, project_id: str, members: list[dict[str, Any]]) -> dict[str, Any]:
        """
        Args:
            project_id: Project to scan
            members: List of member dicts with at least {"id": str, "name": str}

        Returns:
            {
                "inactive_members": [{ member_id, name, days_since_activity, severity }],
                "active_members": [member_id],
                "redistribution_needed": bool,
            }
        """
        now = datetime.now(timezone.utc)
        inactive = []
        active = []

        for member in members:
            mid = member.get("id") or member.get("member_id")
            name = member.get("name", mid)
            last_ts = await activity_tracker.get_member_last_activity(project_id, mid)

            if last_ts is None:
                days_ago = 999
            else:
                last_dt = datetime.fromisoformat(last_ts)
                if last_dt.tzinfo is None:
                    last_dt = last_dt.replace(tzinfo=timezone.utc)
                days_ago = (now - last_dt).days

            if days_ago >= INACTIVITY_CRITICAL_DAYS:
                severity = "critical"
            elif days_ago >= INACTIVITY_WARN_DAYS:
                severity = "warn"
            else:
                severity = None

            if severity:
                inactive.append({
                    "member_id": mid,
                    "name": name,
                    "days_since_activity": days_ago,
                    "severity": severity,
                })
                logger.warning(f"[InactivityDetector] {name} inactive for {days_ago} days [{severity}]")
            else:
                active.append(mid)

        return {
            "inactive_members": inactive,
            "active_members": active,
            "redistribution_needed": any(m["severity"] == "critical" for m in inactive),
        }


inactivity_detector = InactivityDetector()