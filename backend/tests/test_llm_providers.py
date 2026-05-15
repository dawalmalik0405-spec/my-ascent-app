"""Live connectivity tests for configured LLM providers (reads .env)."""

import httpx
import pytest

from src.core.config import get_settings
from src.llm.router import LLMRouter, TaskType, get_llm_router


@pytest.fixture
def router() -> LLMRouter:
    return get_llm_router()


@pytest.mark.asyncio
async def test_openrouter_provider(router: LLMRouter):
    settings = get_settings()
    if not settings.openrouter_api_key:
        pytest.skip("OPENROUTER_API_KEY not set")
    if settings.enable_llm_mock:
        pytest.skip("ENABLE_LLM_MOCK=true")

    try:
        response = await router._call_openrouter(
            [{"role": "user", "content": "Reply with exactly: OK"}],
            settings.llm_default_model,
            0.0,
        )
    except httpx.HTTPStatusError as e:
        pytest.fail(
            f"OpenRouter failed HTTP {e.response.status_code}: "
            f"{e.response.text[:300]}"
        )
    except Exception as e:
        pytest.fail(f"OpenRouter failed: {e}")

    assert response.provider == "openrouter"
    assert response.content.strip()
    print(f"\n  OpenRouter OK — model={response.model}, chars={len(response.content)}")


@pytest.mark.asyncio
async def test_nvidia_nim_provider(router: LLMRouter):
    settings = get_settings()
    if not settings.nvidia_nim_api_key:
        pytest.skip("NVIDIA_NIM_API_KEY not set")
    if settings.enable_llm_mock:
        pytest.skip("ENABLE_LLM_MOCK=true")

    try:
        response = await router._call_nvidia_nim(
            [{"role": "user", "content": "Reply with exactly: OK"}],
            settings.nvidia_nim_model,
            0.0,
        )
    except httpx.HTTPStatusError as e:
        pytest.fail(
            f"NVIDIA NIM failed HTTP {e.response.status_code}: "
            f"{e.response.text[:300]}"
        )
    except Exception as e:
        pytest.fail(f"NVIDIA NIM failed: {e}")

    assert response.provider == "nvidia_nim"
    assert response.content.strip()
    print(f"\n  NVIDIA NIM OK — model={response.model}, chars={len(response.content)}")


@pytest.mark.asyncio
async def test_llm_router_failover_chain():
    settings = get_settings()
    if settings.enable_llm_mock:
        pytest.skip("ENABLE_LLM_MOCK=true")
    if not settings.openrouter_api_key and not settings.nvidia_nim_api_key:
        pytest.skip("No LLM API keys configured")

    router = get_llm_router()
    try:
        response = await router.complete(
            [{"role": "user", "content": "Reply with exactly: OK"}],
            task_type=TaskType.TRIAGE,
        )
    except RuntimeError as e:
        pytest.fail(f"LLM router — all providers failed: {e}")

    assert response.content.strip()
    print(
        f"\n  Router OK — provider={response.provider}, "
        f"model={response.model}, chars={len(response.content)}"
    )
