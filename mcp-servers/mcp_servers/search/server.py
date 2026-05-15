"""Free web search MCP server — DuckDuckGo (no API key required)."""

from __future__ import annotations

import json

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("search")


@mcp.tool()
def web_search(query: str, max_results: int = 5) -> str:
    """Search the web for incident context, outages, and vendor status (free, no API key)."""
    try:
        from duckduckgo_search import DDGS

        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
        return json.dumps(
            {
                "query": query,
                "results": [
                    {
                        "title": r.get("title"),
                        "url": r.get("href"),
                        "snippet": r.get("body"),
                    }
                    for r in results
                ],
            },
            indent=2,
        )
    except ImportError:
        return json.dumps(
            {
                "error": "Install duckduckgo-search: pip install duckduckgo-search",
                "query": query,
            }
        )
    except Exception as e:
        return json.dumps({"error": str(e), "query": query})


if __name__ == "__main__":
    mcp.run()
