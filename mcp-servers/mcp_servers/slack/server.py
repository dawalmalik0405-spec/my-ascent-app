"""Slack MCP server — real Slack Web API via bot token."""

from __future__ import annotations

import json
import os

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("slack")


def _client():
    token = os.environ.get("SLACK_BOT_TOKEN")
    if not token:
        raise ValueError("SLACK_BOT_TOKEN is required")
    from slack_sdk import WebClient

    return WebClient(token=token)


@mcp.tool()
def send_message(channel: str, text: str) -> str:
    """Send a message to a Slack channel (ID or name like #incidents)."""
    client = _client()
    ch = channel if channel.startswith("#") else channel
    resp = client.chat_postMessage(channel=ch, text=text)
    return json.dumps({"ok": resp["ok"], "ts": resp.get("ts"), "channel": resp.get("channel")})


@mcp.tool()
def create_incident_channel(name: str) -> str:
    """Create a public Slack channel for incident response."""
    client = _client()
    channel_name = name if name.startswith("incident-") else f"incident-{name}"
    resp = client.conversations_create(name=channel_name, is_private=False)
    channel_id = resp["channel"]["id"]
    client.conversations_setTopic(
        channel=channel_id,
        topic=f"Incident response channel: {channel_name}",
    )
    return json.dumps({"channel": channel_name, "id": channel_id})


@mcp.tool()
def list_channels(limit: int = 20) -> str:
    """List public Slack channels."""
    client = _client()
    resp = client.conversations_list(types="public_channel", limit=limit)
    channels = [
        {"id": c["id"], "name": c["name"]}
        for c in resp.get("channels", [])
    ]
    return json.dumps({"channels": channels})


if __name__ == "__main__":
    mcp.run()
