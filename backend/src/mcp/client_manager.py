"""Real MCP client — spawns configured servers and invokes tools over the protocol."""

from __future__ import annotations

import json
import os
import re
from contextlib import AsyncExitStack
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.types import TextContent

from src.core.config import get_settings
from src.core.logging import get_logger

logger = get_logger(__name__)

ENV_PATTERN = re.compile(r"\$\{([^}]+)\}")


@dataclass
class ConnectedServer:
    name: str
    session: ClientSession
    tools: list[str] = field(default_factory=list)


@dataclass
class MCPToolCallResult:
    success: bool
    data: Any
    error: str | None = None
    server: str | None = None
    tool: str | None = None


class MCPClientManager:
    """Manages persistent stdio connections to real MCP server processes."""

    def __init__(self, config_path: Path | None = None):
        self._config_path = config_path or self._default_config_path()
        self._stack = AsyncExitStack()
        self._servers: dict[str, ConnectedServer] = {}
        self._tool_index: dict[str, tuple[str, str]] = {}
        self._started = False

    @staticmethod
    def _default_config_path() -> Path:
        return Path(__file__).resolve().parents[2] / "config" / "mcp_servers.json"

    def _resolve_env_value(self, value: str) -> str:
        def replacer(match: re.Match) -> str:
            key = match.group(1)
            if key == "PROJECT_ROOT":
                return str(Path(__file__).resolve().parents[3])
            return os.environ.get(key, "")

        return ENV_PATTERN.sub(replacer, value)

    def _resolve_env_dict(self, env: dict[str, str] | None) -> dict[str, str] | None:
        if not env:
            return None
        resolved = {k: self._resolve_env_value(v) for k, v in env.items()}
        return {k: v for k, v in resolved.items() if v}

    def _server_has_credentials(self, name: str, cfg: dict) -> bool:
        required = cfg.get("required_env", [])
        for key in required:
            if not os.environ.get(key):
                logger.warning("mcp_server_skipped_missing_env", server=name, env_var=key)
                return False
        return True

    async def start(self) -> None:
        if self._started:
            return

        if not self._config_path.exists():
            raise FileNotFoundError(f"MCP config not found: {self._config_path}")

        config = json.loads(self._config_path.read_text())
        servers_cfg = config.get("servers", {})

        for name, cfg in servers_cfg.items():
            if not cfg.get("enabled", True):
                continue
            if not self._server_has_credentials(name, cfg):
                continue
            try:
                await self._connect_server(name, cfg)
            except Exception as e:
                logger.error("mcp_server_connect_failed", server=name, error=str(e))

        self._started = True
        logger.info(
            "mcp_client_started",
            servers=list(self._servers.keys()),
            tools=len(self._tool_index),
        )

    async def _connect_server(self, name: str, cfg: dict) -> None:
        command = cfg["command"]
        args = [self._resolve_env_value(a) for a in cfg.get("args", [])]
        env = self._resolve_env_dict(cfg.get("env"))
        cwd = self._resolve_env_value(cfg["cwd"]) if cfg.get("cwd") else None

        merged_env = {**os.environ, **(env or {})}

        params = StdioServerParameters(
            command=command,
            args=args,
            env=merged_env,
            cwd=cwd,
        )

        read, write = await self._stack.enter_async_context(stdio_client(params))
        session = await self._stack.enter_async_context(ClientSession(read, write))
        await session.initialize()

        tools_result = await session.list_tools()
        tool_names = [t.name for t in tools_result.tools]

        self._servers[name] = ConnectedServer(name=name, session=session, tools=tool_names)
        for tool_name in tool_names:
            self._tool_index[f"{name}.{tool_name}"] = (name, tool_name)

        logger.info("mcp_server_connected", server=name, tools=tool_names)

    async def stop(self) -> None:
        await self._stack.aclose()
        self._servers.clear()
        self._tool_index.clear()
        self._started = False

    def list_tools(self, server: str | None = None) -> list[dict[str, Any]]:
        tools = []
        for key, (srv, tool_name) in self._tool_index.items():
            if server and srv != server:
                continue
            tools.append({"key": key, "server": srv, "name": tool_name})
        return tools

    def resolve_tool(self, tool_key: str) -> tuple[str, str] | None:
        if tool_key in self._tool_index:
            return self._tool_index[tool_key]
        if "." in tool_key:
            server, tool = tool_key.split(".", 1)
            if f"{server}.{tool}" in self._tool_index:
                return self._tool_index[f"{server}.{tool}"]
        return None

    async def call_tool(self, tool_key: str, arguments: dict[str, Any]) -> MCPToolCallResult:
        resolved = self.resolve_tool(tool_key)
        if not resolved:
            return MCPToolCallResult(
                success=False,
                data=None,
                error=f"Tool not found: {tool_key}. Available: {list(self._tool_index.keys())[:20]}...",
            )

        server_name, tool_name = resolved
        connected = self._servers.get(server_name)
        if not connected:
            return MCPToolCallResult(
                success=False,
                data=None,
                error=f"Server not connected: {server_name}",
                server=server_name,
                tool=tool_name,
            )

        try:
            result = await connected.session.call_tool(tool_name, arguments)
            data = self._extract_result_content(result.content)
            return MCPToolCallResult(
                success=not result.isError,
                data=data,
                error=None if not result.isError else str(data),
                server=server_name,
                tool=tool_name,
            )
        except Exception as e:
            logger.exception("mcp_tool_call_failed", server=server_name, tool=tool_name)
            return MCPToolCallResult(
                success=False,
                data=None,
                error=str(e),
                server=server_name,
                tool=tool_name,
            )

    @staticmethod
    def _extract_result_content(content: list) -> Any:
        texts = []
        for block in content:
            if isinstance(block, TextContent):
                texts.append(block.text)
            elif hasattr(block, "text"):
                texts.append(block.text)
        combined = "\n".join(texts)
        try:
            return json.loads(combined)
        except json.JSONDecodeError:
            return combined

    @property
    def is_ready(self) -> bool:
        return self._started and len(self._servers) > 0


_manager: MCPClientManager | None = None


async def get_mcp_client() -> MCPClientManager:
    global _manager
    if _manager is None:
        settings = get_settings()
        config_path = Path(settings.mcp_config_path) if settings.mcp_config_path else None
        _manager = MCPClientManager(config_path=config_path)
        await _manager.start()
    return _manager


async def shutdown_mcp_client() -> None:
    global _manager
    if _manager:
        await _manager.stop()
        _manager = None
