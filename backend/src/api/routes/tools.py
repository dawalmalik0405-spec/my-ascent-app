from fastapi import APIRouter

from src.core.config import get_settings
from src.mcp.client_manager import get_mcp_client
from src.mcp.registry import get_mcp_registry

router = APIRouter(prefix="/tools", tags=["tools"])


@router.get("/mcp/status")
async def mcp_status():
    settings = get_settings()
    if settings.simulate_enterprise_tools:
        return {"mode": "simulation", "connected_servers": [], "tool_count": 0}
    try:
        client = await get_mcp_client()
        return {
            "mode": "real_mcp",
            "connected_servers": list(client._servers.keys()),
            "tool_count": len(client._tool_index),
            "tools_sample": list(client._tool_index.keys())[:30],
        }
    except Exception as e:
        return {"mode": "error", "error": str(e)}


@router.get("/mcp")
async def list_mcp_tools(server: str | None = None):
    registry = get_mcp_registry()
    tools = await registry.list_tools(server=server)
    return [
        {
            "key": f"{t.server}.{t.name}",
            "server": t.server,
            "name": t.name,
            "description": t.description,
            "parameters": t.parameters,
        }
        for t in tools
    ]
