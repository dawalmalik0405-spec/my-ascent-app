"""Normalize MCP tool outcomes for RCA/reporting — reconcile MCP success flags with exit codes and stderr."""

from __future__ import annotations

import json
from typing import Any


def _coerce_blob(data: Any) -> str:
    if data is None:
        return ""
    if isinstance(data, str):
        return data
    try:
        return json.dumps(data, default=str)
    except TypeError:
        return str(data)


def _extract_exit_code(data: Any) -> int | None:
    if not isinstance(data, dict):
        return None
    for key in ("exit_code", "exitCode", "ExitCode"):
        v = data.get(key)
        if v is None:
            continue
        try:
            return int(v)
        except (TypeError, ValueError):
            continue
    return None


def _embedded_error_text(data: Any) -> str:
    if isinstance(data, dict):
        parts: list[str] = []
        for k in ("error", "stderr", "stderr_text", "message"):
            v = data.get(k)
            if isinstance(v, str):
                parts.append(v)
        return "\n".join(parts)
    return ""


_FAILURE_MARKERS = (
    "invalid character '<'",
    "couldn't get current server api group list",
    "could not get current server api group list",
    "unable to locate credentials",
    "couldn't find the requested resource",
    "unable to connect to the server",
    "error: ",
    "\nerror:",
)


def infer_effective_outcome(tool: str | None, record: dict[str, Any]) -> tuple[bool, str]:
    """Return (effective_success, short_reason). Does not mutate record."""
    top_err = record.get("error")
    if isinstance(top_err, str) and top_err.strip():
        return False, top_err.strip()[:280]

    reported = record.get("success")
    data = record.get("data")

    embedded = _embedded_error_text(data)
    blob = (embedded + "\n" + _coerce_blob(data)).lower()

    ec = _extract_exit_code(data)
    if ec is not None and ec != 0:
        return False, f"non_zero_exit_code={ec}"

    for m in _FAILURE_MARKERS:
        if m in blob:
            return False, f"failure_marker:{m.strip()[:72]}"

    if isinstance(data, str) and data.lstrip().startswith("<"):
        return False, "html_response_body"

    if reported is False:
        return False, "mcp_reported_failure"

    return True, "ok"


def annotate_tool_record(record: dict[str, Any]) -> dict[str, Any]:
    """Copy record with outcome_ok / outcome_detail for downstream prompts and UI."""
    out = dict(record)
    tool = out.get("tool")
    ok, detail = infer_effective_outcome(tool if isinstance(tool, str) else None, out)
    out["outcome_ok"] = ok
    out["outcome_detail"] = detail
    return out


def annotate_tool_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [annotate_tool_record(r) for r in records]


def detect_evidence_contradictions(
    investigation_tools: list[dict[str, Any]],
    remediation_results: list[dict[str, Any]],
) -> list[str]:
    """Surface inconsistencies LLMs tend to flatten incorrectly."""

    def _k8_rows(rows: list[dict[str, Any]]) -> list[tuple[str, bool | None]]:
        out: list[tuple[str, bool | None]] = []
        for r in rows:
            tk = str(r.get("tool") or "")
            if "kubernetes" not in tk.lower():
                continue
            ok = r.get("outcome_ok")
            if isinstance(ok, bool):
                out.append((tk, ok))
        return out

    notes: list[str] = []

    combined = [*investigation_tools, *remediation_results]
    k8 = _k8_rows(combined)
    if k8:
        oks = [x for _, x in k8 if x is True]
        bads = [x for _, x in k8 if x is False]
        if oks and bads:
            notes.append(
                "Kubernetes outcomes are mixed: some kubernetes.* calls succeeded while others "
                "failed. Summarize per tool; do not claim the cluster API was wholly unreachable unless "
                "every kubernetes call failed."
            )

    gh_failed = [
        r for r in combined if str(r.get("tool") or "").startswith("github.") and r.get("outcome_ok") is False
    ]
    if gh_failed:
        notes.append(
            "GitHub MCP tools failed or were unavailable — do not claim commit history or code search "
            "was analyzed unless an outcome_ok=true github.* entry exists."
        )

    slack_failed = [
        r for r in remediation_results if str(r.get("tool") or "").startswith("slack.") and r.get("outcome_ok") is False
    ]
    if slack_failed:
        notes.append(
            "Slack notification did not succeed — state explicitly that on-call was not notified via Slack MCP."
        )

    return notes


def alert_demo_context_hints(alert_payload: dict[str, Any] | None) -> list[str]:
    hints: list[str] = []
    if not alert_payload:
        return hints
    blob = json.dumps(
        {
            "labels": alert_payload.get("labels") or {},
            "annotations": alert_payload.get("annotations") or {},
        },
        default=str,
    ).lower()
    if "demo_webapp_checkout_broken" in blob or "demo-checkout-webapp" in blob:
        hints.append(
            "This alert targets the demo checkout gauge/service used for hackathon demos. "
            "User-visible breakage may be simulated via the demo store (Trip checkout). "
            "Treat Kubernetes/GitHub/AWS tooling failures as investigation-environment limits unless "
            "they directly explain that gauge."
        )
    return hints


def build_structured_evidence_bundle(
    alert_payload: dict[str, Any] | None,
    investigation_tools: list[dict[str, Any]],
    remediation_results: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Single structured block for LLM consumption — reduces hallucinated uniformity."""
    remediation_results = remediation_results or []

    ann_i = annotate_tool_records(investigation_tools)
    ann_r = annotate_tool_records(remediation_results)

    rows: list[dict[str, Any]] = []
    for r in ann_i:
        rows.append(
            {
                "phase": "investigation",
                "tool": r.get("tool"),
                "mcp_success_flag": r.get("success"),
                "effective_success": r.get("outcome_ok"),
                "detail": r.get("outcome_detail"),
            }
        )
    for r in ann_r:
        rows.append(
            {
                "phase": "remediation",
                "tool": r.get("tool"),
                "action": r.get("action"),
                "mcp_success_flag": r.get("success"),
                "effective_success": r.get("outcome_ok"),
                "detail": r.get("outcome_detail"),
            }
        )

    return {
        "alert_context_hints": alert_demo_context_hints(alert_payload),
        "evidence_contradictions": detect_evidence_contradictions(ann_i, ann_r),
        "tool_outcomes": rows,
        "analyst_rules": (
            "Use tool_outcomes.effective_success (not mcp_success_flag alone). "
            "If evidence_contradictions is non-empty, mention it explicitly in the narrative. "
            "Separate (1) what the monitoring alert asserts about user/service impact from "
            "(2) which diagnostic actions succeeded or failed."
        ),
    }
