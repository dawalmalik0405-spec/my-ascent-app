"""Send support reply emails via SMTP (same settings as email MCP)."""

from __future__ import annotations

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from src.core.logging import get_logger

logger = get_logger(__name__)


def send_support_reply_email(
    to: str,
    ticket_id: str,
    ticket_subject: str,
    reply_body: str,
) -> dict:
    host = os.environ.get("SMTP_HOST", "").strip()
    if not host:
        logger.warning("support_email_skipped", reason="SMTP_HOST not set", to=to)
        return {"status": "skipped", "reason": "SMTP not configured"}

    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "")
    password = os.environ.get("SMTP_PASSWORD", "")
    from_addr = os.environ.get("SMTP_FROM") or user or "support@ascent.local"
    company = os.environ.get("COMPANY_NAME", "Ascent Support")

    subject = f"Re: {ticket_subject} [{ticket_id[:8]}]"
    plain = (
        f"Hello,\n\n"
        f"Thank you for contacting {company}. Here is our response to your request:\n\n"
        f"{reply_body}\n\n"
        f"---\n"
        f"Ticket reference: {ticket_id}\n"
        f"This is an automated response from {company}."
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to
    msg.attach(MIMEText(plain, "plain", "utf-8"))

    try:
        with smtplib.SMTP(host, port, timeout=30) as server:
            server.ehlo()
            if port != 25:
                server.starttls()
            if user and password:
                server.login(user, password)
            server.sendmail(from_addr, [to], msg.as_string())
        logger.info("support_email_sent", to=to, ticket_id=ticket_id)
        return {"status": "sent", "to": to, "subject": subject}
    except Exception as e:
        logger.exception("support_email_failed", to=to, error=str(e))
        return {"status": "failed", "error": str(e)}
