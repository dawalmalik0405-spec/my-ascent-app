"""Email MCP server — real SMTP delivery."""

from __future__ import annotations

import json
import os
import smtplib
from email.mime.text import MIMEText

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("email")


@mcp.tool()
def send_status_update(to: str, subject: str, body: str) -> str:
    """Send an operational status email via SMTP."""
    host = os.environ.get("SMTP_HOST")
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASSWORD")
    from_addr = os.environ.get("SMTP_FROM", user or "ascent@localhost")

    if not host:
        return json.dumps({"error": "SMTP_HOST not configured"})

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to

    with smtplib.SMTP(host, port, timeout=30) as server:
        server.starttls()
        if user and password:
            server.login(user, password)
        server.sendmail(from_addr, [to], msg.as_string())

    return json.dumps({"status": "sent", "to": to, "subject": subject})


if __name__ == "__main__":
    mcp.run()
