"""Customer Support Intelligence — extensible module demonstrating shared orchestration."""

from typing import Annotated, TypedDict
import operator

from langgraph.graph import END, StateGraph

from src.core.logging import get_logger
from src.events.bus import get_event_bus
from src.llm.router import TaskType, get_llm_router
from src.memory.qdrant_store import get_memory_store

logger = get_logger(__name__)


class SupportState(TypedDict, total=False):
    ticket_id: str
    subject: str
    body: str
    category: str
    priority: str
    correlated_incident_id: str | None
    kb_results: list[dict]
    suggested_response: str
    escalation_required: bool
    messages: Annotated[list[dict], operator.add]


async def ticket_intake(state: SupportState) -> dict:
    return {
        "messages": [{"agent": "ticket_intake", "status": "received"}],
    }


async def classification(state: SupportState) -> dict:
    router = get_llm_router()
    resp = await router.complete(
        [
            {"role": "system", "content": "Classify support ticket. Return JSON: category, priority, escalation_required."},
            {"role": "user", "content": f"Subject: {state.get('subject')}\nBody: {state.get('body', '')}"},
        ],
        task_type=TaskType.TRIAGE,
    )
    import json
    try:
        data = json.loads(resp.content)
    except json.JSONDecodeError:
        data = {"category": "billing", "priority": "high", "escalation_required": True}
    return {
        "category": data.get("category", "general"),
        "priority": data.get("priority", "medium"),
        "escalation_required": data.get("escalation_required", False),
        "messages": [{"agent": "classification", "result": data}],
    }


async def kb_retrieval(state: SupportState) -> dict:
    memory = await get_memory_store()
    results = await memory.search_similar(
        "support",
        f"{state.get('subject')} {state.get('body', '')}",
        limit=3,
    )
    return {"kb_results": results, "messages": [{"agent": "kb_retrieval", "count": len(results)}]}


async def correlate_incident(state: SupportState) -> dict:
    incident_id = None
    if state.get("category") == "billing" and state.get("priority") == "high":
        incident_id = "correlated-via-spike-detection"
        bus = await get_event_bus()
        await bus.publish(
            "support",
            "support.spike_detected",
            {
                "ticket_id": state.get("ticket_id"),
                "category": state.get("category"),
                "message": "Payment complaint spike — correlate with incident module",
            },
        )
    return {
        "correlated_incident_id": incident_id,
        "messages": [{"agent": "escalation", "correlated": bool(incident_id)}],
    }


async def generate_response(state: SupportState) -> dict:
    router = get_llm_router()
    resp = await router.complete(
        [
            {"role": "system", "content": "Generate a professional customer support response."},
            {
                "role": "user",
                "content": f"Ticket: {state.get('subject')}\nCategory: {state.get('category')}\nKB: {state.get('kb_results', [])}",
            },
        ],
        task_type=TaskType.SUMMARIZATION,
    )
    return {
        "suggested_response": resp.content,
        "messages": [{"agent": "customer_response", "status": "complete"}],
    }


def build_support_graph():
    g = StateGraph(SupportState)
    g.add_node("intake", ticket_intake)
    g.add_node("classification", classification)
    g.add_node("kb_retrieval", kb_retrieval)
    g.add_node("correlate", correlate_incident)
    g.add_node("response", generate_response)
    g.set_entry_point("intake")
    g.add_edge("intake", "classification")
    g.add_edge("classification", "kb_retrieval")
    g.add_edge("kb_retrieval", "correlate")
    g.add_edge("correlate", "response")
    g.add_edge("response", END)
    return g.compile()
