import asyncio

from temporalio.client import Client
from temporalio.worker import Worker

from src.core.config import get_settings, get_temporal_host
from src.core.logging import configure_logging, get_logger
from src.mcp.client_manager import get_mcp_client, shutdown_mcp_client
from src.memory.qdrant_store import get_memory_store
from src.workflows.temporal.activities import (
    emit_cross_module_event,
    generate_incident_report,
    persist_workflow_step,
    run_langgraph_investigation,
    update_incident_status,
    validate_recovery,
)
from src.workflows.temporal.incident_workflow import IncidentResponseWorkflow

configure_logging()
logger = get_logger(__name__)


async def run_worker():
    settings = get_settings()
    host = get_temporal_host()
    logger.info("starting_temporal_worker", host=host)

    try:
        await get_memory_store()
        if not settings.simulate_enterprise_tools:
            await get_mcp_client()
            logger.info("worker_mcp_ready")
    except Exception as e:
        logger.warning("worker_startup_partial", error=str(e))

    client = None
    for attempt in range(1, 31):
        try:
            client = await Client.connect(host, namespace=settings.temporal_namespace)
            break
        except Exception as e:
            if attempt == 15:
                raise
            logger.warning("temporal_connect_retry", attempt=attempt, error=str(e))
            await asyncio.sleep(2)

    assert client is not None

    worker = Worker(
        client,
        task_queue=settings.temporal_task_queue,
        workflows=[IncidentResponseWorkflow],
        activities=[
            update_incident_status,
            run_langgraph_investigation,
            persist_workflow_step,
            validate_recovery,
            generate_incident_report,
            emit_cross_module_event,
        ],
    )

    logger.info("worker_ready", task_queue=settings.temporal_task_queue)
    try:
        await worker.run()
    finally:
        await shutdown_mcp_client()


if __name__ == "__main__":
    asyncio.run(run_worker())
