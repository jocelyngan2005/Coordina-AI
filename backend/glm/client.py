"""
glm/client.py — Gemini API client with retry logic and streaming support.
"""

import json
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception

from core.config import settings
from core.exceptions import GLMReasoningError
from core.logger import logger


def _is_retryable_http_error(exc: Exception) -> bool:
    if not isinstance(exc, httpx.HTTPStatusError):
        return False
    return exc.response.status_code in {408, 500, 502, 503, 504}


class GLMClient:
    """
    Low-level async wrapper around Google's Gemini chat completions API.
    All agent reasoning flows through this client.
    """

    def __init__(self):
        self.base_url = settings.GEMINI_API_BASE_URL
        self.model = settings.GEMINI_MODEL
        self.api_key = settings.GEMINI_API_KEY
        self.headers = {
            "Content-Type": "application/json",
        }
        self._client = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=120.0, limits=httpx.Limits(max_connections=100, max_keepalive_connections=50))
        return self._client

    async def close(self):
        if self._client:
            await self._client.aclose()

    def _is_openai_compatible(self) -> bool:
        return "/openai" in self.base_url.lower()

    def _build_request_url(self) -> str:
        if self._is_openai_compatible():
            return f"{self.base_url.rstrip('/')}/chat/completions"

        if self.base_url.endswith(":generateContent"):
            return self.base_url

        return f"{self.base_url.rstrip('/')}/models/{self.model}:generateContent"

    def _build_payload(
        self,
        messages: list[dict],
        system_prompt: str | None,
        temperature: float,
        max_tokens: int | None = None,
        stream: bool = False,
    ) -> dict:
        if self._is_openai_compatible():
            payload_messages = []
            if system_prompt:
                payload_messages.append({"role": "system", "content": system_prompt})
            payload_messages.extend(messages)

            payload = {
                "model": self.model,
                "messages": payload_messages,
                "temperature": temperature,
            }
            if max_tokens is not None:
                payload["max_tokens"] = max_tokens
            if stream:
                payload["stream"] = True
            return payload

        contents = []
        if system_prompt:
            contents.append({"role": "user", "parts": [{"text": system_prompt}]})

        for message in messages:
            contents.append(
                {
                    "role": message.get("role", "user"),
                    "parts": [{"text": message.get("content", "")}],
                }
            )

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
            },
        }
        if max_tokens is not None:
            payload["generationConfig"]["maxOutputTokens"] = max_tokens
        return payload

    @staticmethod
    def _extract_content(data: dict) -> str:
        try:
            candidates = data.get("candidates", [])
            parts = candidates[0]["content"]["parts"]
            text_chunks = [part.get("text", "") for part in parts if isinstance(part, dict)]
            content = "".join(text_chunks)
            if content:
                return content
        except (KeyError, IndexError, TypeError):
            pass

        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as e:
            raise GLMReasoningError(f"Invalid response structure from GLM: {e}") from e

    @staticmethod
    def _format_http_error(exc: httpx.HTTPStatusError) -> str:
        status_code = exc.response.status_code
        body = exc.response.text.strip()
        if status_code == 429:
            return (
                f"Gemini quota exceeded (429 Too Many Requests). "
                f"Please check billing/quota for model '{settings.GEMINI_MODEL}'. "
                f"Provider response: {body}"
            )
        return f"GLM API HTTP error {status_code}: {body}"

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception(_is_retryable_http_error),
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
        """
        if settings.MOCK_GLM:
            logger.info("GLMClient: MOCK_GLM is enabled. Returning mock response.")
            # Return a generic mock JSON that fits most agents
            return json.dumps({
                "status": "success",
                "project_health": "on_track",
                "deadline_failure_probability": 0.05,
                "identified_risks": [],
                "recovery_actions": [],
                "confidence_score": 0.95,
                "analysis": "Mock analysis for performance testing.",
                "tasks": [],
                "milestones": []
            })

        payload = self._build_payload(
            messages=messages,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        logger.debug(f"GLM request: model={self.model}, messages={len(messages) + (1 if system_prompt else 0)}")
        
        client = await self._get_client()
        try:
            response = await client.post(
                self._build_request_url(),
                headers=self.headers,
                json=payload,
                params={"key": self.api_key},
            )
            response.raise_for_status()
            data = response.json()
            logger.debug(f"GLM raw response: {data}")

            content = self._extract_content(data)
            
            # Handle None content
            if content is None:
                logger.error(f"GLM returned None content. Full response: {data}")
                raise GLMReasoningError("GLM returned null content — check model settings or prompt")
            
            logger.debug(f"GLM response received: {len(content)} chars")
            return content

        except httpx.HTTPStatusError as e:
            logger.error(f"GLM API HTTP error: {e.response.status_code} — {e.response.text}")
            raise GLMReasoningError(self._format_http_error(e)) from e
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
        payload = self._build_payload(
            messages=messages,
            system_prompt=system_prompt,
            temperature=temperature,
            stream=True,
        )

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                self._build_request_url(),
                headers=self.headers,
                json=payload,
                params={"key": self.api_key},
            ) as response:
                response.raise_for_status()
                if self._is_openai_compatible():
                    async for line in response.aiter_lines():
                        if line.startswith("data: ") and line != "data: [DONE]":
                            import json
                            chunk = json.loads(line[6:])
                            delta = chunk["choices"][0].get("delta", {})
                            if "content" in delta:
                                yield delta["content"]
                else:
                    async for line in response.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        if line == "data: [DONE]":
                            break
                        import json
                        chunk = json.loads(line[6:])
                        text = self._extract_content(chunk)
                        if text:
                            yield text
        


# Singleton
glm_client = GLMClient()