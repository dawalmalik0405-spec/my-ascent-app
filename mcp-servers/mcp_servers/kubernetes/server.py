"""Kubernetes MCP server — real kubectl / cluster operations."""

from __future__ import annotations

import json
import os
import subprocess

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("kubernetes")


def _kubectl(args: list[str], namespace: str | None = None) -> dict:
    cmd = ["kubectl"]
    if namespace:
        cmd.extend(["-n", namespace])
    cmd.extend(args)
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60,
            env=os.environ.copy(),
        )
        if proc.returncode != 0:
            return {"error": proc.stderr.strip() or proc.stdout.strip(), "exit_code": proc.returncode}
        try:
            return json.loads(proc.stdout) if proc.stdout.strip().startswith(("{", "[")) else {"output": proc.stdout}
        except json.JSONDecodeError:
            return {"output": proc.stdout}
    except FileNotFoundError:
        return {"error": "kubectl not found — install kubectl and configure kubeconfig"}
    except subprocess.TimeoutExpired:
        return {"error": "kubectl command timed out"}


@mcp.tool()
def get_pods(namespace: str = "default") -> str:
    """List pods in a Kubernetes namespace."""
    result = _kubectl(["get", "pods", "-o", "json"], namespace=namespace)
    return json.dumps(result, indent=2)


@mcp.tool()
def get_pod_logs(pod: str, namespace: str = "default", tail: int = 100) -> str:
    """Retrieve logs from a Kubernetes pod."""
    result = _kubectl(["logs", pod, f"--tail={tail}"], namespace=namespace)
    return json.dumps(result, indent=2)


@mcp.tool()
def restart_pod(pod: str, namespace: str = "default") -> str:
    """Delete a pod so the deployment controller recreates it."""
    result = _kubectl(["delete", "pod", pod, "--wait=false"], namespace=namespace)
    return json.dumps(result, indent=2)


@mcp.tool()
def scale_deployment(deployment: str, replicas: int, namespace: str = "default") -> str:
    """Scale a deployment to the specified replica count."""
    result = _kubectl(
        ["scale", "deployment", deployment, f"--replicas={replicas}"],
        namespace=namespace,
    )
    return json.dumps(result, indent=2)


@mcp.tool()
def get_events(namespace: str = "default", limit: int = 20) -> str:
    """Get recent Kubernetes events in a namespace."""
    result = _kubectl(
        ["get", "events", "--sort-by=.lastTimestamp", f"-o=json", f"--field-selector="],
        namespace=namespace,
    )
    return json.dumps(result, indent=2)


if __name__ == "__main__":
    mcp.run()
