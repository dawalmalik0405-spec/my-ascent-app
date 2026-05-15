"""Optional background research scans (default: every 24 hours)."""

from __future__ import annotations

import asyncio

from src.core.config import get_settings
from src.core.logging import get_logger
from src.modules.research.graph import DEFAULT_SCAN_QUERY, build_research_graph
from src.modules.research.service import persist_scan_result

logger = get_logger(__name__)

_task: asyncio.Task | None = None


async def _run_scheduled_scan() -> None:
    settings = get_settings()
    query = settings.research_default_query or DEFAULT_SCAN_QUERY
    logger.info("research_scheduled_scan_start", query=query)
    try:
        graph = build_research_graph()
        result = await graph.ainvoke({"query": query, "messages": []})
        await persist_scan_result(query, result, source="scheduled_scan")
        logger.info("research_scheduled_scan_complete")
    except Exception as e:
        logger.exception("research_scheduled_scan_failed", error=str(e))


async def _scheduler_loop() -> None:
    settings = get_settings()
    interval_hours = max(1, settings.research_auto_scan_hours)
    interval_sec = interval_hours * 3600
    while True:
        await asyncio.sleep(interval_sec)
        await _run_scheduled_scan()


def start_research_scheduler() -> None:
    global _task
    settings = get_settings()
    if not settings.enable_research_auto_scan:
        return
    if _task and not _task.done():
        return
    _task = asyncio.create_task(_scheduler_loop())
    logger.info("research_scheduler_started", interval_hours=settings.research_auto_scan_hours)


def stop_research_scheduler() -> None:
    global _task
    if _task and not _task.done():
        _task.cancel()
    _task = None
