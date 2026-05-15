"""HTTP fetch MCP server — replaces deprecated npm @modelcontextprotocol/server-fetch."""

from __future__ import annotations

import json

import httpx
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("fetch")


@mcp.tool()
def fetch(url: str, max_chars: int = 50000) -> str:
    """Fetch a URL and return text content (for status pages, health checks)."""
    try:
        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            resp = client.get(url)
            text = resp.text[:max_chars]
            return json.dumps(
                {
                    "url": str(resp.url),
                    "status_code": resp.status_code,
                    "content": text,
                },
                indent=2,
            )
    except Exception as e:
        return json.dumps({"url": url, "error": str(e)})


if __name__ == "__main__":
    mcp.run()
