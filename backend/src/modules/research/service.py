"""Persist and load research intelligence for the dashboard."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select

from src.db.models import ResearchSignal
from src.db.session import get_session_factory
from src.modules.research.constants import SECTOR_LABELS, TECH_INDUSTRY_WATCH_QUERIES


def _merge_news_from_signals(signals: list[Any]) -> list[dict[str, Any]]:
    """Newest-first dedupe by URL/title."""
    seen: set[str] = set()
    merged: list[dict[str, Any]] = []
    for sig in signals:
        meta = sig.signal_metadata or {}
        for item in meta.get("news") or []:
            if not isinstance(item, dict):
                continue
            url = (item.get("url") or "").strip().split("#")[0].rstrip("/").lower()
            title_key = (item.get("title") or "").strip().lower()
            key = f"u:{url}" if url else f"t:{title_key}"
            if key.endswith(":") or key in seen:
                continue
            seen.add(key)
            merged.append(item)
    return merged[:48]


def _merge_trends_from_signals(signals: list[Any]) -> list[dict[str, Any]]:
    seen_names: set[str] = set()
    merged: list[dict[str, Any]] = []
    for sig in signals:
        meta = sig.signal_metadata or {}
        for t in meta.get("trends") or []:
            if not isinstance(t, dict):
                continue
            name = (t.get("name") or "").strip().lower()
            if not name or name in seen_names:
                continue
            seen_names.add(name)
            merged.append(t)
    return merged[:20]


def _latest_competitor_intel(signals: list[Any]) -> list[dict[str, Any]]:
    for sig in signals:
        meta = sig.signal_metadata or {}
        ci = meta.get("competitor_intel") or []
        if isinstance(ci, list) and ci:
            return [c for c in ci if isinstance(c, dict)][:8]
    return []


def _latest_analysis_snapshot(signals: list[Any]) -> str:
    for sig in signals:
        meta = sig.signal_metadata or {}
        snap = (meta.get("analysis_snapshot") or "").strip()
        if snap:
            return snap
    return ""


def _derive_pulse_highlights(
    trends: list[dict[str, Any]],
    news: list[dict[str, Any]],
    snapshot: str,
    *,
    limit: int = 14,
) -> list[str]:
    out: list[str] = []
    if snapshot:
        out.append(snapshot[:320])
    for t in trends[:6]:
        name = (t.get("name") or "").strip()
        summ = (t.get("summary") or "").strip()
        if name:
            line = f"{name}: {summ}".strip()
            out.append(line[:240])
    for n in news[:8]:
        tit = (n.get("title") or "").strip()
        if tit:
            out.append(tit[:200])
    deduped: list[str] = []
    seen: set[str] = set()
    for line in out:
        low = line.lower()
        if low in seen:
            continue
        seen.add(low)
        deduped.append(line)
        if len(deduped) >= limit:
            break
    return deduped


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
        "analysis_snapshot": result.get("analysis_snapshot", ""),
        "watch_queries_used": result.get("watch_queries_used", []),
        "answer": result.get("answer"),
        "scanned_at": datetime.now(timezone.utc).isoformat(),
    }
    factory = get_session_factory()
    async with factory() as session:
        signal = ResearchSignal(
            source=source,
            title=f"Research: {query[:100]}",
            summary=(
                result.get("analysis_snapshot")
                or result.get("strategic_insights")
                or result.get("answer")
                or ""
            )[:2000],
            signal_type="strategic",
            relevance_score=0.85,
            signal_metadata=metadata,
        )
        session.add(signal)
        await session.commit()
        await session.refresh(signal)
        return str(signal.id)


async def load_dashboard(limit: int = 24) -> dict[str, Any]:
    factory = get_session_factory()
    async with factory() as session:
        result = await session.execute(
            select(ResearchSignal).order_by(ResearchSignal.created_at.desc()).limit(limit)
        )
        signals = result.scalars().all()

    latest = signals[0] if signals else None

    display_meta: dict[str, Any] = {}
    for s in signals:
        m = s.signal_metadata or {}
        if m.get("trends") or m.get("news"):
            display_meta = m
            break
    if not display_meta and latest:
        display_meta = latest.signal_metadata or {}

    merged_news = _merge_news_from_signals(signals)
    merged_trends = _merge_trends_from_signals(signals)

    news_out = merged_news if merged_news else list(display_meta.get("news") or [])
    trends_out = merged_trends if merged_trends else list(display_meta.get("trends") or [])

    snapshot_latest = _latest_analysis_snapshot(signals)
    competitor_out = _latest_competitor_intel(signals)
    if not competitor_out:
        competitor_out = list(display_meta.get("competitor_intel") or [])

    strategic = ""
    for sig in signals:
        meta = sig.signal_metadata or {}
        si = (meta.get("strategic_insights") or "").strip()
        if len(si) > len(strategic):
            strategic = si
    if not strategic:
        strategic = (
            display_meta.get("strategic_insights")
            or display_meta.get("answer")
            or (latest.summary if latest else "")
            or ""
        )

    pulse = _derive_pulse_highlights(trends_out, news_out, snapshot_latest)

    return {
        "last_scan_at": latest.created_at.isoformat() if latest else None,
        "last_scan_source": latest.source if latest else None,
        "last_query": display_meta.get("query") or (latest.signal_metadata or {}).get("query"),
        "trends": trends_out,
        "news": news_out,
        "competitor_intel": competitor_out,
        "strategic_summary": strategic,
        "analysis_snapshot": snapshot_latest or None,
        "pulse_highlights": pulse,
        "aggregated_news_count": len(news_out),
        "aggregated_trends_count": len(trends_out),
        "signal_count": len(signals),
        "sectors_monitored": list(SECTOR_LABELS),
        "watch_queries": list(TECH_INDUSTRY_WATCH_QUERIES),
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
