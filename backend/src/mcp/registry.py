"""MCP tool registry — routes all invocations to real MCP servers via the protocol."""

import time
from dataclasses import dataclass, field
from typing import Any

from src.core.config import get_settings
from src.core.logging import get_logger
from src.mcp.client_manager import get_mcp_client
from src.observability.metrics import tool_invocations_total

logger = get_logger(__name__)


@dataclass
class MCPTool:
    server: str
    name: str
    description: str
    parameters: dict[str, Any] = field(default_factory=dict)


@dataclass
class MCPToolResult:
    success: bool
    data: Any
    error: str | None = None
    duration_ms: int = 0
    server: str | None = None
    tool: str | None = None


class MCPRegistry:
    """Facade over MCPClientManager — no simulated responses in production mode."""

    def __init__(self):
        self._client = None

    async def _ensure_client(self):
        if self._client is None:
            self._client = await get_mcp_client()

    async def list_tools(self, server: str | None = None) -> list[MCPTool]:
        await self._ensure_client()
        tools = self._client.list_tools(server=server)
        return [
            MCPTool(
                server=t["server"],
                name=t["name"],
                description=f"MCP tool {t['key']}",
            )
            for t in tools
        ]

    async def invoke(self, tool_key: str, arguments: dict[str, Any]) -> MCPToolResult:
        settings = get_settings()

        if settings.simulate_enterprise_tools:
            return await self._invoke_simulated(tool_key, arguments)

        await self._ensure_client()
        if not self._client.is_ready:
            return MCPToolResult(
                success=False,
                data=None,
                error="No MCP servers connected. Check credentials and mcp_servers.json.",
            )

        start = time.perf_counter()
        result = await self._client.call_tool(tool_key, arguments)
        duration_ms = int((time.perf_counter() - start) * 1000)

        status = "success" if result.success else "error"
        srv = result.server or (tool_key.split(".")[0] if "." in tool_key else "unknown")
        tool_name = result.tool or tool_key
        tool_invocations_total.labels(server=srv, tool=tool_name, status=status).inc()

        return MCPToolResult(
            success=result.success,
            data=result.data,
            error=result.error,
            duration_ms=duration_ms,
            server=result.server,
            tool=result.tool,
        )

    async def _invoke_simulated(self, tool_key: str, arguments: dict) -> MCPToolResult:
        """Legacy simulation — only when SIMULATE_ENTERPRISE_TOOLS=true."""
        import asyncio

        simulations = {
            "kubernetes.get_pods": {"pods": [], "simulated": True},
        }
        await asyncio.sleep(0.05)
        return MCPToolResult(
            success=True,
            data=simulations.get(tool_key, {"simulated": True, "tool": tool_key, "arguments": arguments}),
        )


_registry: MCPRegistry | None = None


def get_mcp_registry() -> MCPRegistry:
    global _registry
    if _registry is None:
        _registry = MCPRegistry()
    return _registry
