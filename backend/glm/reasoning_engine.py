"""
glm/reasoning_engine.py — multi-step reasoning orchestration layer.

The ReasoningEngine wraps the raw GLM client and adds:
- Prompt template loading
- Context injection (project state, history)
- Structured output parsing
- Decision logging
"""

import json
import re
from pathlib import Path
from typing import Any

from glm.client import glm_client
from core.exceptions import GLMReasoningError
from core.logger import logger

PROMPTS_DIR = Path(__file__).parent / "prompts"


def load_prompt(name: str) -> str:
    """Load a prompt template from the prompts/ directory."""
    path = PROMPTS_DIR / f"{name}.txt"
    if not path.exists():
        raise FileNotFoundError(f"Prompt template not found: {name}")
    return path.read_text(encoding="utf-8")


class ReasoningEngine:
    """
    Central GLM reasoning interface used by all agents.

    Each agent calls reason() with its task context and receives
    a structured dict response parsed from GLM's output.
    """

    async def reason(
        self,
        prompt_template: str,
        context: dict[str, Any],
        conversation_history: list[dict] | None = None,
        expect_json: bool = True,
        temperature: float = 0.3,
    ) -> dict[str, Any] | str:
        """
        Core reasoning call.

        Args:
            prompt_template: Name of the prompt file (without .txt)
            context: Dict injected into the prompt as JSON
            conversation_history: Prior turns for multi-turn reasoning
            expect_json: If True, parse GLM output as JSON
            temperature: Sampling temperature

        Returns:
            Parsed dict (if expect_json) or raw string
        """
        system_prompt = load_prompt(prompt_template)
        context_block = json.dumps(context, indent=2, ensure_ascii=False)

        user_message = {
            "role": "user",
            "content": (
                f"<context>\n{context_block}\n</context>\n\n"
                f"Respond ONLY with valid JSON. No explanation, no markdown fences."
                if expect_json
                else context_block
            ),
        }

        messages = list(conversation_history or []) + [user_message]

        logger.info(f"ReasoningEngine: calling GLM with prompt='{prompt_template}'")

        raw = await glm_client.chat(
            messages=messages,
            system_prompt=system_prompt,
            temperature=temperature,
        )

        if not expect_json:
            return raw

        return self._parse_json_response(raw, prompt_template)

    def _parse_json_response(self, raw: str, prompt_name: str) -> dict[str, Any]:
        """
        Robustly parse JSON from GLM output.
        Strips markdown fences if the model ignores the instruction.
        """
        cleaned = raw.strip()

        # Strip ```json ... ``` fences
        fence_match = re.search(r"```(?:json)?\s*([\s\S]+?)```", cleaned)
        if fence_match:
            cleaned = fence_match.group(1).strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.error(f"GLM JSON parse failed for prompt '{prompt_name}': {e}\nRaw: {raw[:300]}")
            raise GLMReasoningError(
                f"GLM returned non-JSON output for '{prompt_name}': {str(e)}"
            )

    async def reason_stream(
        self,
        prompt_template: str,
        context: dict[str, Any],
    ):
        """Stream reasoning output — used by WebSocket endpoints."""
        system_prompt = load_prompt(prompt_template)
        context_block = json.dumps(context, indent=2, ensure_ascii=False)
        messages = [{"role": "user", "content": context_block}]
        async for chunk in glm_client.chat_stream(
            messages=messages,
            system_prompt=system_prompt,
        ):
            yield chunk


reasoning_engine = ReasoningEngine()