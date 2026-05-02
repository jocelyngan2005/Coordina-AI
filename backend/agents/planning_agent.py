"""
agents/planning_agent.py

Decomposes structured goals into tasks, milestones, and dependency graphs.
Dynamically replans when project state changes.

Output Spec: See AGENTS_IO_STRUCTURE.md - Planning Agent section
"""

from typing import Any
from agents.base_agent import BaseAgent


class PlanningAgent(BaseAgent):
    agent_name = "planning"
    prompt_template = "planning"

    # Required fields for each task in AI output
    REQUIRED_TASK_FIELDS = {
        "id", "title", "description", "estimated_hours",
        "phase", "priority", "dependencies", "assigned_to",
        "startDate", "endDate"
    }

    VALID_PHASES = {"setup", "design", "implementation", "testing", "documentation"}
    VALID_STATUSES = {"pending", "in_progress", "done", "backlog"}
    VALID_PRIORITIES = {"high", "medium", "low"}

    async def _run(self, context: dict[str, Any]) -> dict[str, Any]:
        """
        Expected context keys:
            - structured_goals: list     Output from InstructionAnalysisAgent
            - team_size: int             Number of team members
            - deadline_date: str         ISO date string
            - project_start_date: str    ISO date string
            - existing_tasks: list       For replanning scenarios (can be empty)
            - days_available: int        Days until deadline

        Returns dict with:
            - tasks: list of task objects with all required fields
            - milestones: list of milestone objects
            - critical_path: list of task IDs on critical path
            - total_estimated_hours: sum of all task hours
            - capacity_analysis: team capacity vs estimated work
            - risk_flags: list of planning-level warnings
        """
        # Planning produces large JSON with many tasks, milestones, and dependencies.
        # Use 20000 tokens to avoid truncation from model max_tokens limit.
        result = await self._reason(context, max_tokens=20000)

        # Validate and normalize task structure
        tasks = result.get("tasks", [])
        for task in tasks:
            # Ensure status field (default to pending)
            if "status" not in task:
                task["status"] = "pending"

            # Validate phase field (CRITICAL - required by frontend)
            # Phase drives tag generation, so missing/invalid phase is a data quality issue
            if "phase" in task and task.get("phase") not in self.VALID_PHASES:
                # Invalid phase - remove it and let frontend infer
                del task["phase"]

            # Ensure assigned_to is an array
            assigned_to = task.get("assigned_to")
            if isinstance(assigned_to, str):
                task["assigned_to"] = [assigned_to]
            elif not isinstance(assigned_to, list):
                task["assigned_to"] = []

            # Ensure dependencies is an array
            dependencies = task.get("dependencies")
            if isinstance(dependencies, str):
                task["dependencies"] = [dependencies]
            elif not isinstance(dependencies, list):
                task["dependencies"] = []

            # Validate required date fields (should always be present)
            if not task.get("startDate"):
                # Use project_start_date as fallback
                task["startDate"] = context.get("project_start_date", "")
            if not task.get("endDate"):
                # Calculate from startDate + hours if available
                if "estimated_hours" in task and task.get("startDate"):
                    hours = float(task["estimated_hours"])
                    days = max(1, int(hours / 6))  # Assume 6 productive hrs/day
                    # Note: proper date math should be done in actual implementation
                    task["endDate"] = task["startDate"]  # Placeholder

            # Set percentage_utilized to 0 for new tasks (will be updated by coordination)
            if "percentage_utilized" not in task:
                task["percentage_utilized"] = 0

        # Calculate capacity analysis
        total_hours = result.get("total_estimated_hours", 0)
        if total_hours == 0 and tasks:
            # Fallback: calculate if not provided by AI
            total_hours = sum(float(t.get("estimated_hours", 0)) for t in tasks)
            result["total_estimated_hours"] = total_hours

        team_size = context.get("team_size", 1)
        days_available = context.get("days_available", 14)

        # Assume ~6 productive hours per day per team member
        team_capacity_hours = team_size * days_available * 6

        result["capacity_analysis"] = {
            "total_estimated_hours": total_hours,
            "team_capacity_hours": team_capacity_hours,
            "overloaded": total_hours > team_capacity_hours,
        }

        # Ensure risk_flags is always present
        if "risk_flags" not in result:
            result["risk_flags"] = []

        # Add capacity warning if overloaded
        if result["capacity_analysis"]["overloaded"]:
            result["risk_flags"].append(
                f"Team capacity exceeded: {total_hours}h needed vs {team_capacity_hours}h available. "
                f"Consider scope reduction or extending timeline."
            )

        return result
