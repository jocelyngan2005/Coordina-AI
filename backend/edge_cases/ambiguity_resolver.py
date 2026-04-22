"""
edge_cases/ambiguity_resolver.py

Handles ambiguous or underspecified project requirements.
Generates clarification questions and creates assumption tracking.
"""

from typing import Any
from glm.reasoning_engine import reasoning_engine
from core.logger import logger


AMBIGUITY_PROMPT = "instruction_analysis"


class AmbiguityResolver:
    """
    When InstructionAnalysisAgent detects ambiguities or low confidence,
    this resolver generates targeted clarification questions and
    records working assumptions so the workflow can continue.
    """

    async def resolve(
        self,
        project_id: str,
        ambiguities: list[dict[str, Any]],
        document_text: str,
    ) -> dict[str, Any]:
        """
        Args:
            project_id: The affected project
            ambiguities: List of ambiguity dicts from InstructionAnalysisAgent
            document_text: Original document for context

        Returns:
            {
                "clarification_questions": [str],
                "working_assumptions": [{"assumption": str, "confidence": float}],
                "can_proceed": bool,
            }
        """
        logger.info(f"[AmbiguityResolver] Resolving {len(ambiguities)} ambiguities for project {project_id}")

        context = {
            "project_id": project_id,
            "ambiguities": ambiguities,
            "document_excerpt": document_text[:2000],  # Limit to avoid token overflow
            "task": (
                "Given the ambiguities listed, generate:\n"
                "1. Specific clarification questions to ask the instructor/client\n"
                "2. Working assumptions that allow the project to proceed\n"
                "3. A boolean 'can_proceed' — True if assumptions are safe enough to continue\n\n"
                "Respond with JSON: { clarification_questions, working_assumptions, can_proceed }"
            ),
        }

        result = await reasoning_engine.reason(
            prompt_template=AMBIGUITY_PROMPT,
            context=context,
            expect_json=True,
        )

        # Ensure required keys exist with safe defaults
        return {
            "clarification_questions": result.get("clarification_questions", []),
            "working_assumptions": result.get("working_assumptions", []),
            "can_proceed": result.get("can_proceed", True),
            "ambiguity_count": len(ambiguities),
        }

    def build_assumption_log(self, assumptions: list[dict]) -> str:
        """Format assumptions as a readable log entry."""
        lines = ["Working Assumptions:"]
        for i, a in enumerate(assumptions, 1):
            confidence = a.get("confidence", "?")
            lines.append(f"  {i}. {a.get('assumption', '')}  [confidence: {confidence}]")
        return "\n".join(lines)


ambiguity_resolver = AmbiguityResolver()