# Ascent MCP Servers

Real MCP servers (stdio protocol) used by the platform.

## Official (via npx, configured in `backend/config/mcp_servers.json`)

- `@modelcontextprotocol/server-github`
- `@modelcontextprotocol/server-fetch`
- `@modelcontextprotocol/server-brave-search`

## Ascent Python servers (real API calls)

| Module | Tools | Requires |
|--------|-------|----------|
| `mcp_servers.kubernetes` | get_pods, get_pod_logs, restart_pod, scale_deployment | kubectl + kubeconfig |
| `mcp_servers.slack` | send_message, create_incident_channel | SLACK_BOT_TOKEN |
| `mcp_servers.cloud` | get_metrics, get_instance_health | AWS credentials |
| `mcp_servers.email` | send_status_update | SMTP_* env vars |

Run manually:
```bash
cd mcp-servers
pip install -r requirements.txt
python -m mcp_servers.kubernetes.server
```

See [docs/MCP_SETUP.md](../docs/MCP_SETUP.md) for full setup.
