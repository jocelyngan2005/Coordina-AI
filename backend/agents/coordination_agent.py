"""
agents/coordination_agent.py

Assigns roles, balances workload, generates meeting agendas,
and tracks contribution fairness across team members.
"""

from typing import Any
from agents.base_agent import BaseAgent


class CoordinationAgent(BaseAgent):
    agent_name = "coordination"
    prompt_template = "coordination"

    async def _run(self, context: dict[str, Any]) -> dict[str, Any]:
        """
        Expected context keys:
            - members: list[dict]        [{id, name, skills, contribution_score}]
            - tasks: list[dict]          Current task list from PlanningAgent
            - activity_history: list     Recent contribution events
            - project_phase: str         "kickoff" | "execution" | "review" | "submission"
        """
        result = await self._reason(context)

        # Compute fairness index (Jain's fairness index on workload hours)
        assignments = result.get("role_assignments", [])
        if assignments:
            hours = [a.get("workload_hours", 0) for a in assignments]
            n = len(hours)
            if n > 0 and sum(h ** 2 for h in hours) > 0:
                fairness = (sum(hours) ** 2) / (n * sum(h ** 2 for h in hours))
                result["fairness_index"] = round(fairness, 3)
            else:
                result["fairness_index"] = 1.0
        else:
            result["fairness_index"] = None

        return result