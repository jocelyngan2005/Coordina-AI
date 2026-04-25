"""
agents/risk_detection_agent.py

Continuously monitors project state to detect inactivity,
deadline risks, ambiguity, and dependency blockers.
Triggers recovery workflows when thresholds are breached.
"""

from typing import Any
from agents.base_agent import BaseAgent
from core.logger import logger

# Thresholds for automatic escalation
INACTIVITY_THRESHOLD_DAYS = 2
CRITICAL_FAILURE_PROBABILITY = 0.75
HIGH_FAILURE_PROBABILITY = 0.50


class RiskDetectionAgent(BaseAgent):
    agent_name = "risk_detection"
    prompt_template = "risk_detection"

    async def _run(self, context: dict[str, Any]) -> dict[str, Any]:
        """
        Expected context keys:
            - project_id: str
            - tasks: list[dict]             With status and completion_pct fields
            - members: list[dict]           With last_activity_at fields
            - deadline_date: str            ISO date
            - current_date: str             ISO date
            - decision_history: list        Past GLM decisions for this project
        """
        result = await self._reason(context)

        failure_prob = result.get("deadline_failure_probability", 0.0)
        health = result.get("project_health", "on_track")

        # Determine if automated recovery should be triggered
        if failure_prob >= CRITICAL_FAILURE_PROBABILITY:
            result["auto_recovery_triggered"] = True
            result["recovery_urgency"] = "immediate"
            logger.warning(
                f"[RiskAgent] Project {context.get('project_id')} — "
                f"CRITICAL failure probability: {failure_prob:.0%}"
            )
        elif failure_prob >= HIGH_FAILURE_PROBABILITY:
            result["auto_recovery_triggered"] = True
            result["recovery_urgency"] = "soon"
            logger.warning(
                f"[RiskAgent] Project {context.get('project_id')} — "
                f"HIGH failure probability: {failure_prob:.0%}"
            )
        else:
            result["auto_recovery_triggered"] = False
            result["recovery_urgency"] = "monitor"

        # Tag inactive members explicitly
        inactive = result.get("inactive_members", [])
        result["inactivity_alert"] = len(inactive) > 0

        # Ensure identified_risks field exists (normalise from legacy "risks" key)
        if "identified_risks" not in result and "risks" in result:
            result["identified_risks"] = result.pop("risks")

        return result