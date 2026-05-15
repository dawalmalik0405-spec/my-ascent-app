from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Project root: backend/src/core/config.py -> ascent_hackathon/
_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_ENV_FILE = _PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE) if _ENV_FILE.exists() else ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    app_secret_key: str = "dev-secret-change-in-production"
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    database_url: str = "postgresql+asyncpg://ascent:ascent@localhost:5432/ascent"
    redis_url: str = "redis://localhost:6379/0"
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str | None = None

    temporal_host: str = "localhost:7233"
    temporal_namespace: str = "default"
    temporal_task_queue: str = "ascent-incident-queue"

    openrouter_api_key: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    nvidia_nim_api_key: str | None = None
    nvidia_nim_base_url: str = "https://integrate.api.nvidia.com/v1"

    llm_default_model: str = "openrouter/free"
    llm_reasoning_model: str = "openrouter/free"
    llm_fallback_model: str = "meta-llama/llama-3.1-8b-instruct"
    nvidia_nim_model: str = "minimaxai/minimax-m2.7"

    embedding_model: str = "text-embedding-3-small"
    embedding_dimension: int = 1536

    otel_exporter_otlp_endpoint: str | None = None
    otel_service_name: str = "ascent-api"
    omium_api_key: str | None = None
    omium_project_id: str | None = None

    enable_hitl: bool = True
    enable_llm_mock: bool = False
    simulate_enterprise_tools: bool = False
    enable_github_remediation_pr: bool = False
    init_mcp_on_api: bool = False
    mcp_config_path: str | None = None

    enable_research_auto_scan: bool = True
    research_auto_scan_hours: int = 24
    research_default_query: str = (
        "latest technology industry news AI agents cloud infrastructure trends"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


def get_temporal_host() -> str:
    """Temporal address for processes running on the host (not inside Docker)."""
    host = get_settings().temporal_host
    if host.startswith("temporal:"):
        return "localhost:7233"
    return host
