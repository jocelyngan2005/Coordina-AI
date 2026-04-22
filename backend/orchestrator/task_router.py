"""
orchestrator/task_router.py

Routes incoming task requests to the correct agent
based on task type and current project state.
"""

from typing import Any
from agents import (
    InstructionAnalysisAgent,
    PlanningAgent,
    CoordinationAgent,
    RiskDetectionAgent,
    SubmissionReadinessAgent,
)
from core.exceptions import WorkflowExecutionError
from core.logger import logger

AGENT_MAP = {
    "analyse_document":   InstructionAnalysisAgent,
    "generate_plan":      PlanningAgent,
    "coordinate_team":    CoordinationAgent,
    "detect_risks":       RiskDetectionAgent,
    "check_submission":   SubmissionReadinessAgent,
}


class TaskRouter:
    """Routes a task_type string to the appropriate agent and executes it."""

    async def route(self, task_type: str, context: dict[str, Any]) -> dict[str, Any]:
        agent_cls = AGENT_MAP.get(task_type)
        if not agent_cls:
            raise WorkflowExecutionError(
                f"Unknown task type: '{task_type}'. "
                f"Valid types: {list(AGENT_MAP.keys())}"
            )
        logger.info(f"[TaskRouter] Routing '{task_type}' → {agent_cls.__name__}")
        agent = agent_cls()
        return await agent.execute(context)

    def available_task_types(self) -> list[str]:
        return list(AGENT_MAP.keys())


task_router = TaskRouter()