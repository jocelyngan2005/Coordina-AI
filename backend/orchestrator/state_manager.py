"""
orchestrator/state_manager.py

Redis-backed stateful project context store.
Each project has a single JSON blob that evolves throughout the workflow.
All agents read from and write to this shared state.
"""

import json
from typing import Any
from datetime import datetime, timezone

from core.redis_client import get_redis
from core.logger import logger

STATE_TTL_SECONDS = 60 * 60 * 24 * 30  # 30 days
KEY_PREFIX = "project:state:"


class StateManager:
    """
    Manages persistent project state in Redis.

    State schema:
    {
        "project_id": str,
        "workflow_stage": str,
        "members": list,
        "structured_goals": list,
        "tasks": list,
        "milestones": list,
        "role_assignments": list,
        "activity_history": list,
        "decision_history": list,
        "last_risk_report": dict,
        "submission_report": dict,
        "created_at": str,
        "updated_at": str,
    }
    """

    def _key(self, project_id: str) -> str:
        return f"{KEY_PREFIX}{project_id}"

    async def get(self, project_id: str) -> dict[str, Any]:
        """Retrieve project state. Returns empty scaffold if not found."""
        redis = get_redis()
        raw = await redis.get(self._key(project_id))
        if raw:
            return json.loads(raw)
        logger.debug(f"[StateManager] No state found for {project_id}, returning scaffold.")
        return self._empty_state(project_id)

    async def save(self, project_id: str, state: dict[str, Any]) -> None:
        """Persist project state back to Redis."""
        state["updated_at"] = datetime.now(timezone.utc).isoformat()
        redis = get_redis()
        await redis.set(
            self._key(project_id),
            json.dumps(state, ensure_ascii=False),
            ex=STATE_TTL_SECONDS,
        )
        logger.debug(f"[StateManager] State saved for project {project_id}.")

    async def delete(self, project_id: str) -> None:
        redis = get_redis()
        await redis.delete(self._key(project_id))

    async def patch(self, project_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        """Partially update state fields without overwriting the whole object."""
        state = await self.get(project_id)
        state.update(updates)
        await self.save(project_id, state)
        return state

    @staticmethod
    def _empty_state(project_id: str) -> dict[str, Any]:
        return {
            "project_id": project_id,
            "workflow_stage": "created",
            "members": [],
            "structured_goals": [],
            "rubric_criteria": [],
            "ambiguities": [],
            "tasks": [],
            "milestones": [],
            "critical_path": [],
            "role_assignments": [],
            "meeting_agenda": [],
            "activity_history": [],
            "decision_history": [],
            "last_risk_report": {},
            "submission_report": {},
            "deadline_date": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }