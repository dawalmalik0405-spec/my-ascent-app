from typing import Literal

from langgraph.graph import END, StateGraph

from src.modules.incident.agents import (
    alert_triage_agent,
    incident_correlation_agent,
    remediation_agent,
    reporting_agent,
    root_cause_analysis_agent,
    validation_agent,
)
from src.modules.incident.state import IncidentState


def _route_after_remediation(state: IncidentState) -> Literal["await_approval", "validate", "end"]:
    if state.get("requires_approval") and not state.get("approval_granted"):
        return "await_approval"
    if state.get("remediation_results"):
        return "validate"
    return "validate"


def _route_after_validation(state: IncidentState) -> Literal["remediate", "report"]:
    validation = state.get("validation_result", {})
    if validation.get("passed", False):
        return "report"
    retries = state.get("validation_retry_count", 0)
    if retries < 1:
        return "remediate"
    return "report"


def build_incident_graph() -> StateGraph:
    graph = StateGraph(IncidentState)

    graph.add_node("alert_triage", alert_triage_agent)
    graph.add_node("incident_correlation", incident_correlation_agent)
    graph.add_node("root_cause_analysis", root_cause_analysis_agent)
    graph.add_node("remediation", remediation_agent)
    graph.add_node("validation", validation_agent)
    graph.add_node("reporting", reporting_agent)

    graph.set_entry_point("alert_triage")
    graph.add_edge("alert_triage", "incident_correlation")
    graph.add_edge("incident_correlation", "root_cause_analysis")
    graph.add_edge("root_cause_analysis", "remediation")
    graph.add_conditional_edges(
        "remediation",
        _route_after_remediation,
        {
            "await_approval": END,
            "validate": "validation",
            "end": END,
        },
    )
    graph.add_conditional_edges(
        "validation",
        _route_after_validation,
        {
            "remediate": "remediation",
            "report": "reporting",
        },
    )
    graph.add_edge("reporting", END)

    return graph


def compile_incident_graph():
    return build_incident_graph().compile()


_incident_graph = None


def get_incident_graph():
    global _incident_graph
    if _incident_graph is None:
        _incident_graph = compile_incident_graph()
    return _incident_graph
