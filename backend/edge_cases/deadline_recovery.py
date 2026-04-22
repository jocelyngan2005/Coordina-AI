"""
edge_cases/deadline_recovery.py

Auto-compresses timelines and re-prioritises tasks when
RiskDetectionAgent triggers deadline failure recovery.
"""

from typing import Any
from glm.reasoning_engine import reasoning_engine
from core.logger import logger


class DeadlineRecovery:
    """
    When deadline failure probability exceeds threshold, this module:
    1. Identifies which tasks to cut / defer / compress
    2. Generates a compressed recovery timeline
    3. Produces a re-prioritised task list focusing on high-grade-impact items
    """

    async def generate_recovery_plan(
        self,
        project_id: str,
        tasks: list[dict[str, Any]],
        deadline_date: str,
        current_date: str,
        risk_report: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Returns a recovery plan with:
        - tasks_to_cut: list of task IDs to drop
        - tasks_to_compress: list of {task_id, new_estimated_hours}
        - priority_order: reordered task IDs by impact
        - recovery_message: human-readable summary
        """
        logger.info(f"[DeadlineRecovery] Generating recovery plan for project {project_id}")

        context = {
            "project_id": project_id,
            "tasks": tasks,
            "deadline_date": deadline_date,
            "current_date": current_date,
            "failure_probability": risk_report.get("deadline_failure_probability", 0),
            "recovery_actions": risk_report.get("recovery_actions", []),
            "task": (
                "The project is at risk of missing its deadline. "
                "Analyse the task list and generate a recovery plan. "
                "Prioritise tasks by their impact on the final grade/rubric score. "
                "Identify tasks that can be safely cut, deferred, or compressed. "
                "Respond with JSON: { tasks_to_cut, tasks_to_compress, priority_order, recovery_message }"
            ),
        }

        result = await reasoning_engine.reason(
            prompt_template="risk_detection",
            context=context,
            expect_json=True,
        )

        return {
            "project_id": project_id,
            "tasks_to_cut": result.get("tasks_to_cut", []),
            "tasks_to_compress": result.get("tasks_to_compress", []),
            "priority_order": result.get("priority_order", []),
            "recovery_message": result.get("recovery_message", "Recovery plan generated."),
        }


deadline_recovery = DeadlineRecovery()