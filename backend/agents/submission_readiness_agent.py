"""
agents/submission_readiness_agent.py

Validates rubric coverage, checks artefact completeness,
and generates a final submission readiness score and checklist.
"""

from typing import Any
from agents.base_agent import BaseAgent

READY_THRESHOLD = 85
NEEDS_WORK_THRESHOLD = 60


class SubmissionReadinessAgent(BaseAgent):
    agent_name = "submission_readiness"
    prompt_template = "submission_readiness"

    async def _run(self, context: dict[str, Any]) -> dict[str, Any]:
        """
        Expected context keys:
            - rubric_criteria: list[dict]   From InstructionAnalysisAgent
            - completed_deliverables: list  Titles of completed items
            - uploaded_artefacts: list      File names / document titles
            - project_id: str
        """
        result = await self._reason(context)

        score = result.get("readiness_score", 0)

        # Override recommendation if score contradicts GLM's label
        if score >= READY_THRESHOLD:
            result["recommendation"] = "ready_to_submit"
        elif score >= NEEDS_WORK_THRESHOLD:
            result["recommendation"] = "needs_work"
        else:
            result["recommendation"] = "not_ready"

        # Summary stats
        coverage = result.get("rubric_coverage", [])
        result["coverage_summary"] = {
            "covered": sum(1 for c in coverage if c.get("status") == "covered"),
            "partial": sum(1 for c in coverage if c.get("status") == "partial"),
            "missing": sum(1 for c in coverage if c.get("status") == "missing"),
            "total": len(coverage),
        }

        return result