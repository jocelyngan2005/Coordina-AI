"""
glm/client.py — Z.AI GLM API client with retry logic and streaming support.
"""

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from core.config import settings
from core.exceptions import GLMReasoningError
from core.logger import logger


class GLMClient:
    """
    Low-level async wrapper around Z.AI's GLM chat completions API.
    All agent reasoning flows through this client.
    """

    def __init__(self):
        self.base_url = settings.ZAI_API_BASE_URL
        self.model = settings.ZAI_MODEL
        self.headers = {
            "Authorization": f"Bearer {settings.ZAI_API_KEY}",
            "Content-Type": "application/json",
        }

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.HTTPStatusError),
        reraise=True,
    )
    async def chat(
        self,
        messages: list[dict],
        system_prompt: str | None = None,
        temperature: float = 0.3,
        max_tokens: int = 10000,
    ) -> str:
        """
        Send a chat request to the GLM model.
        Returns the assistant's text response.
        
        Note: max_tokens set to 10000 for complex agents with large responses
        (planning decomposes to 13+ tasks with detailed descriptions).
        """
        payload_messages = []
        if system_prompt:
            payload_messages.append({"role": "system", "content": system_prompt})
        payload_messages.extend(messages)

        payload = {
            "model": self.model,
            "messages": payload_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        logger.debug(f"GLM request: model={self.model}, messages={len(payload_messages)}")
        logger.debug(f"GLM payload: {payload}")

        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self.headers,
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                logger.debug(f"GLM raw response: {data}")
                
                # Extract content safely
                try:
                    content = data["choices"][0]["message"]["content"]
                except (KeyError, IndexError, TypeError) as e:
                    logger.error(f"GLM response structure invalid: {e}. Full response: {data}")
                    raise GLMReasoningError(f"Invalid response structure from GLM: {e}") from e
                
                # Handle None content
                if content is None:
                    logger.error(f"GLM returned None content. Full response: {data}")
                    raise GLMReasoningError("GLM returned null content — check model settings or prompt")
                
                logger.debug(f"GLM response received: {len(content)} chars")
                return content

            except httpx.HTTPStatusError as e:
                logger.error(f"GLM API HTTP error: {e.response.status_code} — {e.response.text}")
                raise
            except GLMReasoningError:
                raise
            except Exception as e:
                logger.error(f"GLM API unexpected error: {type(e).__name__}: {str(e)}")
                raise GLMReasoningError(f"GLM call failed: {type(e).__name__}: {str(e)}") from e

    async def chat_stream(
        self,
        messages: list[dict],
        system_prompt: str | None = None,
        temperature: float = 0.3,
    ):
        """
        Streaming chat — yields text chunks for real-time WebSocket delivery.
        """
        payload_messages = []
        if system_prompt:
            payload_messages.append({"role": "system", "content": system_prompt})
        payload_messages.extend(messages)

        payload = {
            "model": self.model,
            "messages": payload_messages,
            "temperature": temperature,
            "stream": True,
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: ") and line != "data: [DONE]":
                        import json
                        chunk = json.loads(line[6:])
                        delta = chunk["choices"][0].get("delta", {})
                        if "content" in delta:
                            yield delta["content"]


# Singleton
glm_client = GLMClient()