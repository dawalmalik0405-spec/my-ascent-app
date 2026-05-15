# Real MCP Setup Guide

Ascent uses **real Model Context Protocol servers** — not in-process mocks.

## Architecture

```
Agents → MCPRegistry → MCPClientManager → stdio MCP processes
                                              ├── npx @modelcontextprotocol/server-github
                                              ├── npx @modelcontextprotocol/server-fetch
                                              ├── python mcp_servers.search (DuckDuckGo, free)
                                              ├── python mcp_servers.kubernetes (kubectl)
                                              ├── python mcp_servers.slack (Slack API)
                                              ├── python mcp_servers.cloud (AWS CloudWatch)
                                              └── python mcp_servers.email (SMTP)
```

## Requirements

1. **Node.js 18+** and `npx` (for official Anthropic MCP servers)
2. **Python 3.11+** with `mcp`, `slack-sdk`, `boto3`
3. **kubectl** + valid kubeconfig (for Kubernetes MCP)
4. API keys in `.env` (see `.env.example`)

## Enable Real Mode

```env
SIMULATE_ENTERPRISE_TOOLS=false
ENABLE_LLM_MOCK=false
```

## Credentials Checklist

| Server | Env vars | What it does |
|--------|----------|--------------|
| github | `GITHUB_TOKEN`, `GITHUB_REPO` | Commits, code search, PRs |
| search | (none) | Free web search during RCA (DuckDuckGo) |
| fetch | (none) | HTTP fetch for status pages |
| kubernetes | kubeconfig | Real `kubectl get pods/logs/scale` |
| slack | `SLACK_BOT_TOKEN` | Real Slack messages |
| cloud | AWS credentials | CloudWatch metrics |
| email | `SMTP_*` | Real email delivery |

Servers without credentials are **skipped** at startup (logged as warning).

## Verify Connections

```bash
curl http://localhost:8000/api/v1/tools/mcp/status
```

Expected:
```json
{
  "mode": "real_mcp",
  "connected_servers": ["github", "fetch", "kubernetes", ...],
  "tool_count": 42
}
```

## Install MCP Server Dependencies

```bash
# Backend
cd backend && pip install -r requirements.txt

# Python MCP servers
cd mcp-servers && pip install -r requirements.txt

# Official servers are pulled via npx on first connect
```

## Which Approach Is Best?

| Approach | Use when |
|----------|----------|
| **Official npx MCP servers** | GitHub, Fetch, Brave — maintained, standard protocol |
| **Ascent Python MCP servers** | K8s, Slack, Cloud, Email — need custom enterprise logic |
| **Simulation** | Never for production — only `SIMULATE_ENTERPRISE_TOOLS=true` for offline UI dev |

**Recommendation:** Official MCP for generic tools + thin Python MCP servers for systems that need your credentials and policies. This is what Ascent implements.

## Troubleshooting

- **No servers connected:** Check `GET /api/v1/tools/mcp/status` and API logs
- **GitHub fails:** Token needs `repo` scope
- **kubectl fails:** Mount kubeconfig in Docker or run API on host
- **npx hangs on Windows:** Ensure Node is in PATH; try running `npx -y @modelcontextprotocol/server-fetch` manually
