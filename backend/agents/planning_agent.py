"""
agents/planning_agent.py

Decomposes structured goals into tasks, milestones, and dependency graphs.
Dynamically replans when project state changes.
"""

from typing import Any
from agents.base_agent import BaseAgent


class PlanningAgent(BaseAgent):
    agent_name = "planning"
    prompt_template = "planning"

    async def _run(self, context: dict[str, Any]) -> dict[str, Any]:
        """
        Expected context keys:
            - structured_goals: list     Output from InstructionAnalysisAgent
            - team_size: int
            - deadline_date: str         ISO date string
            - project_start_date: str    ISO date string
            - existing_tasks: list       For replanning scenarios (can be empty)
        """
        result = await self._reason(context)

        # Annotate each task with a status field for initial plan
        for task in result.get("tasks", []):
            if "status" not in task:
                task["status"] = "pending"

        # Flag if total estimated hours exceeds team capacity
        total_hours = result.get("total_estimated_hours", 0)
        team_size = context.get("team_size", 1)
        days_available = context.get("days_available", 14)
        team_capacity_hours = team_size * days_available * 2  # ~2 productive hrs/day

        result["capacity_analysis"] = {
            "total_estimated_hours": total_hours,
            "team_capacity_hours": team_capacity_hours,
            "overloaded": total_hours > team_capacity_hours,
        }

        return result