import asyncio
import json
import os
import time
from typing import Any

from src.core.config import get_settings
from src.core.logging import get_logger
from src.llm.router import TaskType, get_llm_router
from src.mcp.registry import get_mcp_registry
from src.mcp.tool_map import INCIDENT_TOOLS, github_repo
from src.memory.qdrant_store import get_memory_store
from src.modules.incident.state import IncidentState, RemediationAction
from src.observability.metrics import agent_duration_seconds, agent_executions_total
from src.observability.tracing import trace_span

logger = get_logger(__name__)

DEFAULT_NAMESPACE = os.environ.get("K8S_NAMESPACE", "production")
DEFAULT_SLACK_CHANNEL = os.environ.get("SLACK_INCIDENT_CHANNEL", "#incidents")


async def _run_agent(agent_name: str, state: IncidentState, fn) -> dict[str, Any]:
    start = time.perf_counter()
    with trace_span(f"agent.{agent_name}", {"incident_id": state.get("incident_id", "")}) as trace_id:
        try:
            updates = await fn(state, trace_id)
            agent_executions_total.labels(agent=agent_name, status="success").inc()
            return {
                **updates,
                "current_agent": agent_name,
                "trace_id": trace_id,
                "agent_messages": [
                    {
                        "from": agent_name,
                        "timestamp": time.time(),
                        "summary": updates.get("_message_summary", f"{agent_name} completed"),
                    }
                ],
            }
        except Exception as e:
            agent_executions_total.labels(agent=agent_name, status="error").inc()
            logger.exception("agent_failed", agent=agent_name, error=str(e))
            return {"current_agent": agent_name, "errors": [f"{agent_name}: {str(e)}"]}
        finally:
            agent_duration_seconds.labels(agent=agent_name).observe(time.perf_counter() - start)


async def _invoke_mcp(mcp, tool_key: str, args: dict) -> dict:
    result = await mcp.invoke(tool_key, args)
    return {
        "tool": tool_key,
        "success": result.success,
        "data": result.data,
        "error": result.error,
        "server": result.server,
    }


async def alert_triage_agent(state: IncidentState) -> dict[str, Any]:
    async def _execute(s: IncidentState, trace_id: str) -> dict:
        router = get_llm_router()
        alert = s.get("alert_payload", {})
        labels = alert.get("labels", {})
        annotations = alert.get("annotations", {})
        default_triage = {
            "severity": labels.get("severity", alert.get("severity", "high")),
            "service": labels.get("service", alert.get("service", s.get("service", "unknown"))),
            "summary": annotations.get("summary", s.get("title", "Operational alert")),
            "requires_escalation": labels.get("severity", "high") in ("critical", "high"),
        }
        prompt = (
            f"Triage this operational alert and return JSON with severity, service, summary, "
            f"requires_escalation fields:\n{json.dumps(alert, indent=2)}"
        )
        try:
            response = await asyncio.wait_for(
                router.complete(
                    [
                        {
                            "role": "system",
                            "content": "You are an SRE alert triage agent. Respond with valid JSON only.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    task_type=TaskType.TRIAGE,
                ),
                timeout=45.0,
            )
            try:
                triage = json.loads(response.content)
            except json.JSONDecodeError:
                triage = {**default_triage, "summary": response.content[:500]}
        except Exception:
            triage = default_triage
        return {
            "triage_result": triage,
            "severity": triage.get("severity", "high"),
            "service": triage.get("service", alert.get("service", "unknown")),
            "title": triage.get("summary", s.get("title", "Untitled Incident")),
            "status": "triaging",
            "_message_summary": f"Triage: {triage.get('severity')} - {triage.get('service')}",
        }

    return await _run_agent("alert_triage", state, _execute)


async def incident_correlation_agent(state: IncidentState) -> dict[str, Any]:
    async def _execute(s: IncidentState, trace_id: str) -> dict:
        query = f"{s.get('service')} {s.get('title', '')} {json.dumps(s.get('alert_payload', {}))}"
        similar: list[dict] = []
        try:
            memory = await get_memory_store()
            similar = await memory.find_similar_incidents(query, service=s.get("service"), limit=5)
        except Exception as e:
            logger.warning("incident_correlation_memory_skipped", error=str(e))
        correlation = {
            "related_incidents": similar,
            "correlation_score": similar[0]["score"] if similar else 0.0,
            "pattern": "recurring" if similar and similar[0].get("score", 0) > 0.85 else "new",
        }
        return {
            "correlation_result": correlation,
            "historical_incidents": similar,
            "status": "correlating",
            "_message_summary": f"Correlation: {correlation['pattern']} incident pattern",
        }

    return await _run_agent("incident_correlation", state, _execute)


async def root_cause_analysis_agent(state: IncidentState) -> dict[str, Any]:
    async def _execute(s: IncidentState, trace_id: str) -> dict:
        mcp = get_mcp_registry()
        tool_results = []
        namespace = s.get("environment") or DEFAULT_NAMESPACE
        if namespace == "production":
            namespace = DEFAULT_NAMESPACE

        pods_key, pods_args_fn = INCIDENT_TOOLS["pods"]
        pods_result = await _invoke_mcp(mcp, pods_key, pods_args_fn(namespace))
        tool_results.append(pods_result)

        pod_name = os.environ.get("K8S_DEBUG_POD", "")
        if not pod_name and pods_result.get("success") and isinstance(pods_result.get("data"), dict):
            items = pods_result["data"].get("items", [])
            for item in items:
                status = item.get("status", {}).get("phase", "")
                if status != "Running":
                    pod_name = item.get("metadata", {}).get("name", "")
                    break
            if not pod_name and items:
                pod_name = items[0].get("metadata", {}).get("name", "")

        if pod_name:
            logs_key, logs_args_fn = INCIDENT_TOOLS["logs"]
            tool_results.append(await _invoke_mcp(mcp, logs_key, logs_args_fn(pod_name, namespace)))

        commits_key, commits_args_fn = INCIDENT_TOOLS["commits"]
        tool_results.append(await _invoke_mcp(mcp, commits_key, commits_args_fn()))

        owner, repo = github_repo()
        search_key, search_args_fn = INCIDENT_TOOLS["search_code"]
        tool_results.append(
            await _invoke_mcp(mcp, search_key, search_args_fn("connection pool redis"))
        )

        metrics_key, metrics_args_fn = INCIDENT_TOOLS["metrics"]
        tool_results.append(await _invoke_mcp(mcp, metrics_key, metrics_args_fn(s.get("service", ""))))

        service = s.get("service", "payment")
        web_key, web_args_fn = INCIDENT_TOOLS["web_search"]
        tool_results.append(
            await _invoke_mcp(mcp, web_key, web_args_fn(f"{service} outage status"))
        )

        findings = [
            r.get("tool", "") + (": " + str(r.get("error") or "ok")[:80]) for r in tool_results
        ]
        inc_id = s.get("incident_id")
        if inc_id:
            from src.modules.incident.persist import persist_investigation_evidence

            await persist_investigation_evidence(
                str(inc_id),
                tool_results=tool_results,
                investigation_findings=findings,
            )

        router = get_llm_router()
        context = json.dumps(
            {
                "triage": s.get("triage_result"),
                "correlation": s.get("correlation_result"),
                "mcp_tool_results": tool_results,
                "historical": s.get("historical_incidents", [])[:3],
            },
            indent=2,
            default=str,
        )
        try:
            response = await asyncio.wait_for(
                router.complete(
                    [
                        {
                            "role": "system",
                            "content": "You are an expert SRE performing root cause analysis from REAL tool outputs. Be specific.",
                        },
                        {"role": "user", "content": f"Analyze this incident:\n{context}"},
                    ],
                    task_type=TaskType.REASONING,
                ),
                timeout=90.0,
            )
            root_cause = response.content
        except Exception:
            root_cause = (
                f"RCA from MCP evidence for {s.get('service', 'service')}: "
                + "; ".join(findings[:6])
            )

        return {
            "investigation_findings": findings,
            "root_cause": root_cause,
            "status": "investigating",
            "tool_results": tool_results,
            "_message_summary": "RCA complete using real MCP tool outputs",
        }

    return await _run_agent("root_cause_analysis", state, _execute)


async def remediation_agent(state: IncidentState) -> dict[str, Any]:
    async def _execute(s: IncidentState, trace_id: str) -> dict:
        owner, repo = github_repo()
        plan: list[RemediationAction] = [
            {
                "tool": "kubernetes.scale_deployment",
                "arguments": {
                    "deployment": os.environ.get("K8S_DEPLOYMENT", s.get("service", "payment-api")),
                    "replicas": int(os.environ.get("K8S_SCALE_REPLICAS", "5")),
                    "namespace": DEFAULT_NAMESPACE,
                },
                "risk_level": "medium",
                "description": "Scale deployment to absorb load during recovery",
            },
            {
                "tool": f"slack.send_message",
                "arguments": {
                    "channel": DEFAULT_SLACK_CHANNEL,
                    "text": f"Remediation in progress: {s.get('title', 'incident')}",
                },
                "risk_level": "low",
                "description": "Notify incident channel via Slack MCP",
            },
        ]

        settings = get_settings()
        if settings.enable_github_remediation_pr and os.environ.get("GITHUB_TOKEN"):
            plan.insert(
                0,
                {
                    "tool": "github.create_pull_request",
                    "arguments": {
                        "owner": owner,
                        "repo": repo,
                        "title": "Revert: incident remediation",
                        "head": os.environ.get("GITHUB_REVERT_BRANCH", "revert/incident"),
                        "base": "main",
                        "body": "Automated revert PR from Ascent incident workflow",
                    },
                    "risk_level": "high",
                    "description": "Open revert PR (requires approval)",
                },
            )

        requires_approval = any(a["risk_level"] == "high" for a in plan)
        results = []

        if not requires_approval or state.get("approval_granted"):
            mcp = get_mcp_registry()
            for action in plan:
                if action["risk_level"] == "high" and not state.get("approval_granted"):
                    continue
                results.append(
                    {
                        "action": action["description"],
                        **(
                            await _invoke_mcp(mcp, action["tool"], action["arguments"])
                        ),
                    }
                )

        return {
            "remediation_plan": plan,
            "remediation_results": results,
            "requires_approval": requires_approval and not state.get("approval_granted"),
            "status": "awaiting_approval" if requires_approval and not state.get("approval_granted") else "executing",
            "_message_summary": f"Remediation: {len(plan)} actions via real MCP",
        }

    return await _run_agent("remediation", state, _execute)


async def validation_agent(state: IncidentState) -> dict[str, Any]:
    async def _execute(s: IncidentState, trace_id: str) -> dict:
        mcp = get_mcp_registry()
        namespace = DEFAULT_NAMESPACE
        pods_key, pods_fn = INCIDENT_TOOLS["pods"]
        pods = await _invoke_mcp(mcp, pods_key, pods_fn(namespace))

        all_running = False
        if pods.get("success") and isinstance(pods.get("data"), dict):
            items = pods["data"].get("items", [])
            all_running = bool(items) and all(
                i.get("status", {}).get("phase") == "Running" for i in items
            )

        fetch_key, _ = INCIDENT_TOOLS["fetch_url"]
        health_url = os.environ.get("HEALTH_CHECK_URL", "")
        fetch_ok = False
        if health_url:
            fetch_result = await _invoke_mcp(mcp, fetch_key, {"url": health_url})
            fetch_ok = fetch_result.get("success", False)

        passed = all_running or fetch_ok
        retry_count = s.get("validation_retry_count", 0)
        if not passed:
            retry_count += 1

        return {
            "validation_result": {
                "passed": passed,
                "pods_running": all_running,
                "health_check": fetch_ok,
                "checks_run": 2,
            },
            "validation_retry_count": retry_count,
            "status": "reporting" if passed else "validating",
            "tool_results": [pods],
            "_message_summary": f"Validation {'passed' if passed else 'failed'}",
        }

    return await _run_agent("validation", state, _execute)


async def reporting_agent(state: IncidentState) -> dict[str, Any]:
    async def _execute(s: IncidentState, trace_id: str) -> dict:
        from uuid import UUID

        router = get_llm_router()
        context = {
            "title": s.get("title"),
            "severity": s.get("severity"),
            "root_cause": s.get("root_cause"),
            "findings": s.get("investigation_findings"),
            "remediation": s.get("remediation_results"),
            "validation": s.get("validation_result"),
        }
        try:
            response = await router.complete(
                [
                    {"role": "system", "content": "Generate a professional incident postmortem report."},
                    {"role": "user", "content": f"Create incident report:\n{json.dumps(context, indent=2)}"},
                ],
                task_type=TaskType.SUMMARIZATION,
            )
            report_content = response.content
        except Exception:
            report_content = (
                f"# Incident: {s.get('title')}\n\n"
                f"**Severity:** {s.get('severity')}\n\n"
                f"**Root cause:** {s.get('root_cause', 'See investigation findings')}\n\n"
                f"**Remediation:** {json.dumps(s.get('remediation_results', []), default=str)[:800]}\n\n"
                f"**Validation:** {json.dumps(s.get('validation_result', {}), default=str)}"
            )

        memory = await get_memory_store()
        inc_id = s.get("incident_id", "00000000-0000-0000-0000-000000000099")
        try:
            uid = UUID(inc_id) if isinstance(inc_id, str) else inc_id
        except ValueError:
            uid = UUID("00000000-0000-0000-0000-000000000099")
        await memory.store_incident_memory(
            incident_id=uid,
            summary=s.get("title", ""),
            service=s.get("service"),
            severity=s.get("severity", "medium"),
            root_cause=s.get("root_cause"),
        )

        return {
            "incident_report": report_content,
            "status": "resolved",
            "_message_summary": "Incident report generated and stored in semantic memory",
        }

    return await _run_agent("reporting", state, _execute)
