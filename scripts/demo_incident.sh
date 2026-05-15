#!/usr/bin/env bash
# Demo: trigger a production incident workflow
set -euo pipefail

API_URL="${API_URL:-http://localhost:8000}"

echo "=== Ascent Platform — Incident Intelligence Demo ==="

echo ""
echo "1. Ingesting monitoring alert..."
INCIDENT=$(curl -s -X POST "$API_URL/api/v1/webhooks/alerts" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "firing",
    "labels": {
      "alertname": "PaymentAPILatencyHigh",
      "severity": "critical",
      "service": "payment-api",
      "environment": "production"
    },
    "annotations": {
      "summary": "Payment API P99 latency > 2s",
      "description": "P99 latency spike detected on payment-api after deployment v2.4.1"
    }
  }')

echo "$INCIDENT" | python -m json.tool
INCIDENT_ID=$(echo "$INCIDENT" | python -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo ""
echo "2. Waiting for autonomous investigation..."
sleep 5

echo ""
echo "3. Fetching incident trace..."
curl -s "$API_URL/api/v1/workflows/incident/$INCIDENT_ID/trace" | python -m json.tool

echo ""
echo "4. Listing MCP tools..."
curl -s "$API_URL/api/v1/tools/mcp" | python -c "import sys,json; tools=json.load(sys.stdin); print(f'{len(tools)} tools registered')"

echo ""
echo "=== Demo complete. Open http://localhost:3000 for dashboard ==="
