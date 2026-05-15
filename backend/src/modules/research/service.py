"""Persist and load research intelligence for the dashboard."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select

from src.db.models import ResearchSignal
from src.db.session import get_session_factory


async def persist_scan_result(
    query: str,
    result: dict[str, Any],
    *,
    source: str = "platform_scan",
) -> str:
    trends = result.get("trends", [])
    news = result.get("news_items", [])
    metadata = {
        "query": query,
        "trends": trends,
        "news": news,
        "competitor_intel": result.get("competitor_intel", []),
        "strategic_insights": result.get("strategic_insights", ""),
        "answer": result.get("answer"),
        "scanned_at": datetime.now(timezone.utc).isoformat(),
    }
    factory = get_session_factory()
    async with factory() as session:
        signal = ResearchSignal(
            source=source,
            title=f"Research: {query[:100]}",
            summary=(result.get("strategic_insights") or result.get("answer") or "")[:2000],
            signal_type="strategic",
            relevance_score=0.85,
            signal_metadata=metadata,
        )
        session.add(signal)
        await session.commit()
        await session.refresh(signal)
        return str(signal.id)


async def load_dashboard(limit: int = 10) -> dict[str, Any]:
    factory = get_session_factory()
    async with factory() as session:
        result = await session.execute(
            select(ResearchSignal).order_by(ResearchSignal.created_at.desc()).limit(limit)
        )
        signals = result.scalars().all()

    latest = signals[0] if signals else None

    # Cards use the richest saved scan (Ask-only rows often lack trends/news).
    display_meta: dict[str, Any] = {}
    for s in signals:
        m = s.signal_metadata or {}
        if m.get("trends") or m.get("news"):
            display_meta = m
            break
    if not display_meta and latest:
        display_meta = latest.signal_metadata or {}

    return {
        "last_scan_at": latest.created_at.isoformat() if latest else None,
        "last_scan_source": latest.source if latest else None,
        "last_query": display_meta.get("query") or (latest.signal_metadata or {}).get("query"),
        "trends": display_meta.get("trends", []),
        "news": display_meta.get("news", []),
        "competitor_intel": display_meta.get("competitor_intel", []),
        "strategic_summary": display_meta.get("strategic_insights")
        or display_meta.get("answer")
        or (latest.summary if latest else ""),
        "signals": [
            {
                "id": str(s.id),
                "source": s.source,
                "title": s.title,
                "summary": s.summary,
                "signal_type": s.signal_type,
                "created_at": s.created_at.isoformat(),
                "metadata": s.signal_metadata or {},
            }
            for s in signals
        ],
    }
