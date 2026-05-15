"""Maps incident workflow steps to real MCP tool names (official + Ascent servers)."""

import os


def github_repo() -> tuple[str, str]:
    repo = os.environ.get("GITHUB_REPO", "org/payment-api")
    if "/" in repo:
        owner, name = repo.split("/", 1)
        return owner, name
    return os.environ.get("GITHUB_REPO_OWNER", "org"), os.environ.get("GITHUB_REPO_NAME", "payment-api")


# Incident investigation uses these real MCP tools
INCIDENT_TOOLS = {
    "pods": ("kubernetes.get_pods", lambda ns: {"namespace": ns}),
    "logs": ("kubernetes.get_pod_logs", lambda pod, ns: {"pod": pod, "namespace": ns, "tail": 200}),
    "commits": ("github.list_commits", lambda: {"owner": github_repo()[0], "repo": github_repo()[1]}),
    "search_code": (
        "github.search_code",
        lambda q: {"q": f"{q} repo:{github_repo()[0]}/{github_repo()[1]}"},
    ),
    "metrics": (
        "cloud.get_metrics",
        lambda svc: {
            "namespace": os.environ.get("CLOUDWATCH_NAMESPACE", "AWS/ApplicationELB"),
            "metric_name": os.environ.get("CLOUDWATCH_METRIC", "TargetResponseTime"),
            "dimension_name": "LoadBalancer",
            "dimension_value": os.environ.get("CLOUDWATCH_DIMENSION", ""),
        },
    ),
    "web_search": ("search.web_search", lambda q: {"query": q, "max_results": 5}),
    "fetch_url": ("fetch.fetch", lambda url: {"url": url}),
    "slack_notify": (
        "slack.send_message",
        lambda ch, text: {"channel": ch, "text": text},
    ),
}
