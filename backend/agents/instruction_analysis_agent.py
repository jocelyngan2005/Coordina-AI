"""
agents/instruction_analysis_agent.py

Parses project briefs and rubrics.
Converts unstructured document text → structured goals + grading priorities.
"""

from typing import Any
from agents.base_agent import BaseAgent


class InstructionAnalysisAgent(BaseAgent):
    agent_name = "instruction_analysis"
    prompt_template = "instruction_analysis"

    async def _run(self, context: dict[str, Any]) -> dict[str, Any]:
        """
        Expected context keys:
            - document_text: str         Raw text from parsed brief/rubric
            - document_type: str         "brief" | "rubric" | "combined"
            - project_id: str
        """
        result = await self._reason(context)

        # Post-process: if confidence is low, escalate ambiguities
        confidence = result.get("confidence_score", 1.0)
        if confidence < 0.6:
            result["escalation_required"] = True
            result["escalation_reason"] = (
                "Low confidence in requirement extraction. "
                "Manual review or clarification recommended."
            )
        else:
            result["escalation_required"] = False

        return result