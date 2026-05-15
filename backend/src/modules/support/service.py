"""Support ticket processing — graph, persistence, email."""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import SupportTicket
from src.modules.support.email_delivery import send_support_reply_email
from src.modules.support.graph import build_support_graph


async def process_support_ticket(
    session: AsyncSession,
    *,
    subject: str,
    body: str,
    customer_email: str | None = None,
    priority: str = "medium",
    external_id: str | None = None,
    source: str = "internal",
) -> tuple[SupportTicket, dict[str, Any]]:
    record = SupportTicket(
        subject=subject,
        body=body,
        external_id=external_id,
        priority=priority,
        ticket_metadata={"customer_email": customer_email, "source": source},
    )
    session.add(record)
    await session.flush()

    graph = build_support_graph()
    result = await graph.ainvoke(
        {
            "ticket_id": str(record.id),
            "subject": subject,
            "body": body or "",
            "messages": [],
        }
    )

    suggested = result.get("suggested_response") or ""
    record.category = result.get("category")
    record.priority = result.get("priority", priority)
    if result.get("correlated_incident_id"):
        record.status = "escalated"
    else:
        record.status = "responded" if suggested else record.status

    email_status: dict[str, Any] = {"status": "not_attempted"}
    if customer_email and suggested:
        email_status = send_support_reply_email(
            to=customer_email,
            ticket_id=str(record.id),
            ticket_subject=subject,
            reply_body=suggested,
        )

    record.ticket_metadata = {
        **(record.ticket_metadata or {}),
        "customer_email": customer_email,
        "suggested_response": suggested,
        "email_delivery": email_status,
        "source": source,
    }

    await session.commit()
    await session.refresh(record)
    return record, {**result, "email_delivery": email_status}
