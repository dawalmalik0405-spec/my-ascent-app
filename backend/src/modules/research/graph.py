"""R&D / Market Intelligence — web search, trend analysis, strategic storage."""

from __future__ import annotations

import json
import operator
import re
from typing import Annotated, Any, TypedDict
from uuid import uuid4

from langgraph.graph import END, StateGraph

from src.core.logging import get_logger
from src.llm.router import TaskType, get_llm_router
from src.mcp.registry import get_mcp_registry
from src.memory.qdrant_store import get_memory_store

logger = get_logger(__name__)

DEFAULT_SCAN_QUERY = "latest technology industry news AI agents cloud infrastructure trends 2026"


class ResearchState(TypedDict, total=False):
    query: str
    sources: list[dict]
    news_items: list[dict]
    trends: list[dict]
    competitor_intel: list[dict]
    strategic_insights: str
    answer: str
    messages: Annotated[list[dict], operator.add]


def _parse_web_search_payload(data: Any) -> list[dict]:
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except json.JSONDecodeError:
            return []
    if not isinstance(data, dict):
        return []
    items = []
    for r in data.get("results", [])[:8]:
        if not isinstance(r, dict):
            continue
        title = (r.get("title") or "").strip()
        if not title:
            continue
        items.append(
            {
                "title": title,
                "url": r.get("url") or r.get("href") or "",
                "snippet": (r.get("snippet") or r.get("body") or "")[:500],
                "summary": "",
            }
        )
    return items


def _parse_llm_json(content: str) -> dict:
    content = content.strip()
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", content)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return {}


async def research_agent(state: ResearchState) -> dict:
    mcp = get_mcp_registry()
    query = state.get("query") or DEFAULT_SCAN_QUERY
    web = await mcp.invoke("search.web_search", {"query": query, "max_results": 8})
    news_items = _parse_web_search_payload(web.data if web.success else [])
    return {
        "sources": [{"type": "web_search", "query": query, "data": web.data}],
        "news_items": news_items,
        "messages": [{"agent": "research", "news_count": len(news_items)}],
    }


async def trend_analysis(state: ResearchState) -> dict:
    router = get_llm_router()
    news = state.get("news_items", [])
    context = json.dumps(news[:8], indent=2) if news else str(state.get("sources", []))
    trends: list[dict] = []
    try:
        resp = await router.complete(
            [
                {
                    "role": "system",
                    "content": (
                        "You analyze tech industry news. Return ONLY valid JSON with keys: "
                        "trends (array of {name, summary, impact: high|medium|low}), "
                        "news (array of {title, summary} — one summary per source title, 1-2 sentences)."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Query: {state.get('query')}\n\nSources:\n{context}",
                },
            ],
            task_type=TaskType.REASONING,
        )
        parsed = _parse_llm_json(resp.content)
        for t in parsed.get("trends", [])[:6]:
            if isinstance(t, dict) and t.get("name"):
                trends.append(
                    {
                        "name": t.get("name", ""),
                        "summary": t.get("summary", ""),
                        "impact": t.get("impact", "medium"),
                    }
                )
        news_summaries = {n.get("title"): n.get("summary") for n in parsed.get("news", []) if isinstance(n, dict)}
        enriched_news = []
        for item in news:
            title = item.get("title", "")
            enriched_news.append(
                {
                    **item,
                    "summary": news_summaries.get(title) or item.get("snippet", "")[:200],
                }
            )
        news = enriched_news or news
    except Exception as e:
        logger.warning("trend_analysis_llm_failed", error=str(e))
        trends = [
            {"name": "AI agent platforms", "summary": "Autonomous ops tooling accelerating.", "impact": "high"},
            {"name": "Durable workflows", "summary": "Temporal-style orchestration adoption growing.", "impact": "medium"},
        ]

    return {
        "news_items": news,
        "trends": trends,
        "messages": [{"agent": "trend_analysis", "trend_count": len(trends)}],
    }


async def competitor_intel(state: ResearchState) -> dict:
    router = get_llm_router()
    try:
        resp = await router.complete(
            [
                {
                    "role": "system",
                    "content": 'Return JSON: {"competitors": [{"name", "move", "relevance"}]} — max 4 items.',
                },
                {
                    "role": "user",
                    "content": f"Industry context for: {state.get('query')}\nTrends: {state.get('trends', [])}",
                },
            ],
            task_type=TaskType.REASONING,
        )
        parsed = _parse_llm_json(resp.content)
        intel = [c for c in parsed.get("competitors", []) if isinstance(c, dict)][:4]
    except Exception:
        intel = [{"name": "Enterprise AIOps vendors", "move": "Shipping agentic SRE products", "relevance": "high"}]
    return {"competitor_intel": intel, "messages": [{"agent": "competitor_intel"}]}


async def strategy_agent(state: ResearchState) -> dict:
    router = get_llm_router()
    try:
        resp = await router.complete(
            [
                {
                    "role": "system",
                    "content": "Write executive strategic intelligence (3-5 paragraphs) for enterprise ops leaders.",
                },
                {
                    "role": "user",
                    "content": (
                        f"Query: {state.get('query')}\n"
                        f"Trends: {json.dumps(state.get('trends', []))}\n"
                        f"News: {json.dumps(state.get('news_items', [])[:5])}\n"
                        f"Competitors: {json.dumps(state.get('competitor_intel', []))}"
                    ),
                },
            ],
            task_type=TaskType.REASONING,
        )
        insights = resp.content
    except Exception as e:
        logger.warning("strategy_llm_failed", error=str(e))
        insights = "Strategic analysis unavailable — see trend and news cards for raw intelligence."

    try:
        memory = await get_memory_store()
        await memory.store(
            "research",
            str(uuid4()),
            insights,
            {"query": state.get("query"), "type": "strategic_insight"},
        )
    except Exception as e:
        logger.warning("research_qdrant_store_failed", error=str(e))

    return {
        "strategic_insights": insights,
        "messages": [{"agent": "strategy", "status": "complete"}],
    }


async def answer_agent(state: ResearchState) -> dict:
    """Synthesize a direct answer to the user's question from gathered sources."""
    router = get_llm_router()
    try:
        resp = await router.complete(
            [
                {
                    "role": "system",
                    "content": (
                        "You are a tech industry analyst. Answer the user's question using the provided "
                        "news and trends. Be specific, cite themes from sources, and note uncertainty where needed."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Question: {state.get('query')}\n\n"
                        f"News:\n{json.dumps(state.get('news_items', [])[:8], indent=2)}\n\n"
                        f"Trends:\n{json.dumps(state.get('trends', []), indent=2)}"
                    ),
                },
            ],
            task_type=TaskType.REASONING,
        )
        answer = resp.content
    except Exception as e:
        logger.warning("research_answer_failed", error=str(e))
        answer = "Unable to generate an answer right now. Try running a full scan or check LLM configuration."
    return {"answer": answer, "messages": [{"agent": "answer"}]}


def build_research_graph():
    g = StateGraph(ResearchState)
    g.add_node("research", research_agent)
    g.add_node("trends", trend_analysis)
    g.add_node("competitors", competitor_intel)
    g.add_node("strategy", strategy_agent)
    g.set_entry_point("research")
    g.add_edge("research", "trends")
    g.add_edge("trends", "competitors")
    g.add_edge("competitors", "strategy")
    g.add_edge("strategy", END)
    return g.compile()


def build_research_ask_graph():
    """Lighter graph: search → analyze → answer (no full strategy write-up)."""
    g = StateGraph(ResearchState)
    g.add_node("research", research_agent)
    g.add_node("trends", trend_analysis)
    g.add_node("answer", answer_agent)
    g.set_entry_point("research")
    g.add_edge("research", "trends")
    g.add_edge("trends", "answer")
    g.add_edge("answer", END)
    return g.compile()
