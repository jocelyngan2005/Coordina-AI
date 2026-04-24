"""tests/integration/test_glm_reasoning.py

Tests for the GLM reasoning engine — all actual HTTP calls are mocked.
"""

import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock

from glm.reasoning_engine import ReasoningEngine
from glm.client import glm_client
from core.exceptions import GLMReasoningError


VALID_JSON_RESPONSE = json.dumps({
    "structured_goals": [{"goal_id": "G1", "statement": "Build system", "priority": "high"}],
    "confidence_score": 0.9,
})

FENCED_JSON_RESPONSE = f"```json\n{VALID_JSON_RESPONSE}\n```"


@pytest.fixture
def engine():
    return ReasoningEngine()


@pytest.mark.asyncio
async def test_reason_returns_parsed_dict(engine):
    with patch.object(glm_client, "chat", new=AsyncMock(return_value=VALID_JSON_RESPONSE)):
        result = await engine.reason(
            prompt_template="instruction_analysis",
            context={"document_text": "Build a web app", "document_type": "brief"},
            expect_json=True,
        )
    assert isinstance(result, dict)
    assert "structured_goals" in result


@pytest.mark.asyncio
async def test_reason_strips_markdown_fences(engine):
    with patch.object(glm_client, "chat", new=AsyncMock(return_value=FENCED_JSON_RESPONSE)):
        result = await engine.reason(
            prompt_template="instruction_analysis",
            context={"document_text": "Brief", "document_type": "brief"},
            expect_json=True,
        )
    assert isinstance(result, dict)
    assert result["confidence_score"] == 0.9


@pytest.mark.asyncio
async def test_reason_raises_on_invalid_json(engine):
    bad_response = "This is not JSON at all."
    with patch.object(glm_client, "chat", new=AsyncMock(return_value=bad_response)):
        with pytest.raises(GLMReasoningError):
            await engine.reason(
                prompt_template="instruction_analysis",
                context={},
                expect_json=True,
            )


@pytest.mark.asyncio
async def test_reason_returns_raw_string_when_not_json(engine):
    raw = "This is a free-form response."
    with patch.object(glm_client, "chat", new=AsyncMock(return_value=raw)):
        result = await engine.reason(
            prompt_template="instruction_analysis",
            context={"text": "hello"},
            expect_json=False,
        )
    assert result == raw


@pytest.mark.asyncio
async def test_reason_passes_conversation_history(engine):
    history = [
        {"role": "user", "content": "Previous question"},
        {"role": "assistant", "content": "Previous answer"},
    ]
    captured = {}

    async def capture_chat(messages, system_prompt=None, **kwargs):
        captured["messages"] = messages
        return VALID_JSON_RESPONSE

    with patch.object(glm_client, "chat", new=capture_chat):
        await engine.reason(
            prompt_template="planning",
            context={"goals": []},
            conversation_history=history,
            expect_json=True,
        )

    # History turns should appear before the final user message
    assert captured["messages"][0]["content"] == "Previous question"
    assert captured["messages"][1]["content"] == "Previous answer"
    assert captured["messages"][-1]["role"] == "user"


@pytest.mark.asyncio
async def test_prompt_template_not_found_raises(engine):
    with pytest.raises(FileNotFoundError):
        await engine.reason(
            prompt_template="nonexistent_prompt_xyz",
            context={},
            expect_json=False,
        )