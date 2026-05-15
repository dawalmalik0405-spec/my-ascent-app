import hashlib
import time
from dataclasses import dataclass
from enum import Enum
from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

_NON_RETRYABLE_HTTP = frozenset({401, 402, 403, 404, 422})

from src.core.config import get_settings
from src.core.logging import get_logger
from src.observability.metrics import llm_requests_total, llm_latency_seconds

logger = get_logger(__name__)


class TaskType(str, Enum):
    TRIAGE = "triage"
    REASONING = "reasoning"
    SUMMARIZATION = "summarization"
    EMBEDDING = "embedding"


@dataclass
class ProviderHealth:
    failures: int = 0
    last_failure: float = 0.0
    circuit_open: bool = False

    def record_failure(self) -> None:
        self.failures += 1
        self.last_failure = time.time()
        if self.failures >= 5:
            self.circuit_open = True

    def record_success(self) -> None:
        self.failures = 0
        self.circuit_open = False

    def is_available(self) -> bool:
        if not self.circuit_open:
            return True
        if time.time() - self.last_failure > 60:
            self.circuit_open = False
            self.failures = 0
            return True
        return False


@dataclass
class LLMResponse:
    content: str
    model: str
    provider: str
    input_tokens: int = 0
    output_tokens: int = 0


class LLMRouter:
    def __init__(self):
        self._health: dict[str, ProviderHealth] = {
            "openrouter": ProviderHealth(),
            "nvidia_nim": ProviderHealth(),
        }

    def _select_model(self, task_type: TaskType) -> str:
        settings = get_settings()
        if task_type == TaskType.REASONING:
            return settings.llm_reasoning_model
        if task_type == TaskType.TRIAGE:
            return settings.llm_default_model
        return settings.llm_default_model

    def _provider_chain(self) -> list[str]:
        settings = get_settings()
        order: list[str] = []
        if settings.openrouter_api_key:
            order.append("openrouter")
        if settings.nvidia_nim_api_key:
            order.append("nvidia_nim")
        if not order:
            order = ["openrouter", "nvidia_nim"]
        return [p for p in order if self._health[p].is_available()]

    @staticmethod
    def _is_non_retryable(exc: Exception) -> bool:
        if isinstance(exc, httpx.HTTPStatusError):
            return exc.response.status_code in _NON_RETRYABLE_HTTP
        return False

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, max=30),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
    )
    async def complete(
        self,
        messages: list[dict[str, str]],
        task_type: TaskType = TaskType.REASONING,
        temperature: float = 0.2,
    ) -> LLMResponse:
        settings = get_settings()

        if settings.enable_llm_mock:
            return self._mock_complete(messages, task_type)

        model = self._select_model(task_type)
        last_error: Exception | None = None

        for provider in self._provider_chain():
            try:
                start = time.perf_counter()
                if provider == "openrouter":
                    result = await self._call_openrouter(messages, model, temperature)
                else:
                    result = await self._call_nvidia_nim(
                        messages, settings.nvidia_nim_model, temperature
                    )
                self._health[provider].record_success()
                llm_requests_total.labels(provider=provider, status="success").inc()
                llm_latency_seconds.labels(provider=provider).observe(time.perf_counter() - start)
                return result
            except Exception as e:
                last_error = e
                if self._is_non_retryable(e):
                    self._health[provider].circuit_open = True
                else:
                    self._health[provider].record_failure()
                llm_requests_total.labels(provider=provider, status="error").inc()
                logger.warning("llm_provider_failed", provider=provider, error=str(e))

        raise RuntimeError(f"All LLM providers failed: {last_error}")

    async def _call_openrouter(
        self, messages: list[dict], model: str, temperature: float
    ) -> LLMResponse:
        settings = get_settings()
        if not settings.openrouter_api_key:
            raise ValueError("OpenRouter API key not configured")

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{settings.openrouter_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openrouter_api_key}",
                    "HTTP-Referer": "https://ascent-platform.local",
                },
                json={"model": model, "messages": messages, "temperature": temperature},
            )
            resp.raise_for_status()
            data = resp.json()
            usage = data.get("usage", {})
            return LLMResponse(
                content=data["choices"][0]["message"]["content"],
                model=model,
                provider="openrouter",
                input_tokens=usage.get("prompt_tokens", 0),
                output_tokens=usage.get("completion_tokens", 0),
            )

    async def _call_nvidia_nim(
        self, messages: list[dict], model: str, temperature: float
    ) -> LLMResponse:
        settings = get_settings()
        if not settings.nvidia_nim_api_key:
            raise ValueError("NVIDIA NIM API key not configured")

        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(
                f"{settings.nvidia_nim_base_url}/chat/completions",
                headers={"Authorization": f"Bearer {settings.nvidia_nim_api_key}"},
                json={"model": model, "messages": messages, "temperature": temperature},
            )
            resp.raise_for_status()
            data = resp.json()
            usage = data.get("usage", {})
            return LLMResponse(
                content=data["choices"][0]["message"]["content"],
                model=model,
                provider="nvidia_nim",
                input_tokens=usage.get("prompt_tokens", 0),
                output_tokens=usage.get("completion_tokens", 0),
            )

    def _mock_complete(self, messages: list[dict], task_type: TaskType) -> LLMResponse:
        user_msg = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
        mock_responses = {
            TaskType.TRIAGE: (
                '{"severity": "high", "service": "payment-api", '
                '"summary": "Payment API latency spike detected", "requires_escalation": true}'
            ),
            TaskType.REASONING: (
                "Root cause: Recent deployment v2.4.1 introduced connection pool exhaustion "
                "in payment-api. Redis connection timeouts correlate with deploy timestamp. "
                "Recommendation: rollback deployment and scale connection pool."
            ),
            TaskType.SUMMARIZATION: (
                "Incident resolved via deployment rollback. MTTR: 12 minutes. "
                "Root cause: connection pool misconfiguration in v2.4.1."
            ),
        }
        return LLMResponse(
            content=mock_responses.get(task_type, f"Processed: {user_msg[:200]}"),
            model="mock-model",
            provider="mock",
        )

    @staticmethod
    def _hash_embed(text: str, dimension: int) -> list[float]:
        """Deterministic local vectors for Qdrant — no LLM round-trip (avoids Temporal heartbeat timeouts)."""
        h = hashlib.sha256(text.encode()).digest()
        return [((h[i % len(h)] / 255.0) * 2 - 1) for i in range(dimension)]

    async def embed(self, text: str) -> list[float]:
        settings = get_settings()
        return self._hash_embed(text, settings.embedding_dimension)


_router: LLMRouter | None = None


def get_llm_router() -> LLMRouter:
    global _router
    if _router is None:
        _router = LLMRouter()
    return _router
