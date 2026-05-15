from fastapi import APIRouter
from pydantic import BaseModel, Field

from src.core.config import get_settings
from src.modules.research.graph import build_research_ask_graph, build_research_graph
from src.modules.research.service import load_dashboard, persist_scan_result

router = APIRouter(prefix="/research", tags=["research"])


class ResearchQuery(BaseModel):
    query: str = Field(default="AI agent orchestration enterprise trends", min_length=3)


class NewsItem(BaseModel):
    title: str
    url: str = ""
    snippet: str = ""
    summary: str = ""


class TrendItem(BaseModel):
    name: str
    summary: str = ""
    impact: str = "medium"


class ResearchResponse(BaseModel):
    query: str
    trends: list[TrendItem | dict]
    news: list[NewsItem | dict]
    strategic_insights: str
    competitor_intel: list[dict]
    analysis_snapshot: str | None = None
    answer: str | None = None
    signal_id: str | None = None


class AskResponse(BaseModel):
    query: str
    answer: str
    trends: list[dict]
    news: list[dict]


@router.get("/dashboard")
async def research_dashboard():
    settings = get_settings()
    data = await load_dashboard(limit=28)
    data["auto_scan_enabled"] = settings.enable_research_auto_scan
    data["auto_scan_interval_hours"] = settings.research_auto_scan_hours
    data["default_query"] = settings.research_default_query
    return data


@router.post("/scan", response_model=ResearchResponse)
async def run_research_scan(body: ResearchQuery):
    graph = build_research_graph()
    result = await graph.ainvoke({"query": body.query, "messages": []})
    signal_id = await persist_scan_result(body.query, result, source="platform_scan")

    return ResearchResponse(
        query=body.query,
        trends=result.get("trends", []),
        news=result.get("news_items", []),
        strategic_insights=result.get("strategic_insights", ""),
        competitor_intel=result.get("competitor_intel", []),
        analysis_snapshot=(result.get("analysis_snapshot") or None),
        signal_id=signal_id,
    )


@router.post("/ask", response_model=AskResponse)
async def ask_research(body: ResearchQuery):
    """Answer a user question using live web search + LLM synthesis."""
    graph = build_research_ask_graph()
    result = await graph.ainvoke({"query": body.query, "messages": []})
    await persist_scan_result(body.query, result, source="user_query")

    return AskResponse(
        query=body.query,
        answer=result.get("answer", ""),
        trends=result.get("trends", []),
        news=result.get("news_items", []),
    )


@router.get("/signals")
async def list_signals(limit: int = 20):
    data = await load_dashboard(limit=limit)
    return data["signals"]
