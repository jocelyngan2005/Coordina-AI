"""
agents/base_agent.py — abstract base class for all Coordina agents.

Every agent:
  - Receives a project context dict
  - Calls the GLM reasoning engine
  - Logs its decision
  - Returns a typed output dict
"""

from abc import ABC, abstractmethod
from typing import Any
from datetime import datetime, timezone

from glm.reasoning_engine import reasoning_engine
from core.logger import logger


class BaseAgent(ABC):
    """
    All specialised agents extend this class.
    Each agent owns a single prompt template and a single execute() method.
    """

    agent_name: str = "base"
    prompt_template: str = "base_system"

    async def execute(self, context: dict[str, Any]) -> dict[str, Any]:
        """
        Public entry point. Wraps _run() with logging and error handling.
        """
        logger.info(f"Agent '{self.agent_name}' starting execution.")
        start = datetime.now(timezone.utc)

        try:
            result = await self._run(context)
            elapsed = (datetime.now(timezone.utc) - start).total_seconds()
            logger.info(f"Agent '{self.agent_name}' completed in {elapsed:.2f}s.")
            return {
                "agent": self.agent_name,
                "status": "success",
                "result": result,
                "executed_at": start.isoformat(),
                "duration_seconds": elapsed,
            }
        except Exception as e:
            logger.error(f"Agent '{self.agent_name}' failed: {e}")
            return {
                "agent": self.agent_name,
                "status": "error",
                "error": str(e),
                "executed_at": start.isoformat(),
            }

    @abstractmethod
    async def _run(self, context: dict[str, Any]) -> dict[str, Any]:
        """Implemented by each concrete agent."""
        pass

    async def _reason(
        self,
        context: dict[str, Any],
        history: list[dict] | None = None,
        expect_json: bool = True,
        max_tokens: int | None = None,
    ) -> dict[str, Any]:
        """Convenience wrapper around the reasoning engine."""
        return await reasoning_engine.reason(
            prompt_template=self.prompt_template,
            context=context,
            conversation_history=history,
            expect_json=expect_json,
            max_tokens=max_tokens,
        )