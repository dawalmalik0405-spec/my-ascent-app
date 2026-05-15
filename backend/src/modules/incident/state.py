import operator
from typing import Annotated, Any, TypedDict


class RemediationAction(TypedDict):
    tool: str
    arguments: dict[str, Any]
    risk_level: str
    description: str


class IncidentState(TypedDict, total=False):
    incident_id: str
    correlation_id: str
    alert_payload: dict[str, Any]
    title: str
    description: str
    severity: str
    service: str
    environment: str
    status: str

    triage_result: dict[str, Any]
    correlation_result: dict[str, Any]
    historical_incidents: list[dict[str, Any]]
    investigation_findings: list[str]
    root_cause: str
    remediation_plan: list[RemediationAction]
    remediation_results: list[dict[str, Any]]
    validation_result: dict[str, Any]
    incident_report: str

    requires_approval: bool
    approval_id: str | None
    approval_granted: bool
    validation_retry_count: int

    agent_messages: Annotated[list[dict[str, Any]], operator.add]
    tool_results: Annotated[list[dict[str, Any]], operator.add]
    errors: Annotated[list[str], operator.add]
    current_agent: str
    trace_id: str
