"""
memory/decision_log.py

Logs every GLM reasoning decision with full context.
Provides auditability — judges and users can trace WHY the AI made each decision.
"""

import json
from datetime import datetime, timezone
from typing import Any

from core.redis_client import get_redis
from core.logger import logger

LOG_KEY_PREFIX = "project:decisions:"
MAX_LOG_ENTRIES = 200


class DecisionLogger:
    """
    Appends agent decisions to a Redis list (capped at MAX_LOG_ENTRIES).
    Each entry records: agent name, summary, full output, timestamp.
    """

    def _key(self, project_id: str) -> str:
        return f"{LOG_KEY_PREFIX}{project_id}"

    async def log(
        self,
        project_id: str,
        agent: str,
        decision_summary: str,
        output: dict[str, Any],
    ) -> None:
        entry = {
            "agent": agent,
            "summary": decision_summary,
            "output": output,
            "logged_at": datetime.now(timezone.utc).isoformat(),
        }
        redis = get_redis()
        key = self._key(project_id)
        await redis.rpush(key, json.dumps(entry, ensure_ascii=False))
        # Keep list bounded
        await redis.ltrim(key, -MAX_LOG_ENTRIES, -1)
        logger.debug(f"[DecisionLog] Logged decision for project {project_id} by agent '{agent}'")

    async def get_all(self, project_id: str) -> list[dict[str, Any]]:
        """Retrieve full decision history for a project."""
        redis = get_redis()
        raw_entries = await redis.lrange(self._key(project_id), 0, -1)
        return [json.loads(e) for e in raw_entries]

    async def get_recent(self, project_id: str, n: int = 10) -> list[dict[str, Any]]:
        redis = get_redis()
        raw_entries = await redis.lrange(self._key(project_id), -n, -1)
        return [json.loads(e) for e in raw_entries]