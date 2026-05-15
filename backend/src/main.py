from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import health, incidents, research, support, tools, webhooks, workflows
from src.core.config import get_settings
from src.core.logging import configure_logging, get_logger
from src.events.bus import get_event_bus
from src.memory.qdrant_store import get_memory_store
from src.mcp.client_manager import get_mcp_client, shutdown_mcp_client
from src.modules.research.scheduler import start_research_scheduler, stop_research_scheduler
from src.observability.tracing import init_tracing

configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    init_tracing()
    try:
        await get_event_bus()
        await get_memory_store()
        if not settings.simulate_enterprise_tools and (
            settings.init_mcp_on_api or settings.enable_research_auto_scan
        ):
            await get_mcp_client()
        start_research_scheduler()
        logger.info("platform_started", env=settings.app_env)
    except Exception as e:
        logger.warning("startup_partial", error=str(e))
    yield
    stop_research_scheduler()
    await shutdown_mcp_client()
    logger.info("platform_shutdown")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Ascent Platform",
        description="Enterprise Autonomous Operations Platform",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(incidents.router, prefix="/api/v1")
    app.include_router(webhooks.router, prefix="/api/v1")
    app.include_router(workflows.router, prefix="/api/v1")
    app.include_router(support.router, prefix="/api/v1")
    app.include_router(research.router, prefix="/api/v1")
    app.include_router(tools.router, prefix="/api/v1")

    return app


app = create_app()
