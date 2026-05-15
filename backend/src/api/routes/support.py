from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import SupportTicket
from src.db.session import get_db
from src.modules.support.service import process_support_ticket

router = APIRouter(prefix="/support", tags=["support"])


class TicketCreate(BaseModel):
    subject: str = Field(min_length=3, max_length=500)
    body: str | None = None
    external_id: str | None = None
    priority: str = "medium"
    customer_email: EmailStr | None = None


class CustomerComplaint(BaseModel):
    """Public customer portal — email required for reply delivery."""

    customer_email: EmailStr
    customer_name: str | None = Field(default=None, max_length=128)
    subject: str = Field(min_length=3, max_length=500)
    body: str = Field(min_length=10, max_length=8000)


class TicketResponse(BaseModel):
    id: str
    subject: str
    category: str | None
    priority: str | None
    status: str
    correlated_incident_id: str | None
    customer_email: str | None = None
    suggested_response: str | None = None
    email_status: str | None = None
    email_error: str | None = None


def _to_response(ticket: SupportTicket, result: dict | None = None) -> TicketResponse:
    meta = ticket.ticket_metadata or {}
    email = meta.get("email_delivery") or {}
    return TicketResponse(
        id=str(ticket.id),
        subject=ticket.subject,
        category=ticket.category,
        priority=ticket.priority,
        status=ticket.status,
        correlated_incident_id=(
            str(ticket.correlated_incident_id) if ticket.correlated_incident_id else None
        ),
        customer_email=meta.get("customer_email"),
        suggested_response=meta.get("suggested_response") or (result or {}).get("suggested_response"),
        email_status=email.get("status"),
        email_error=email.get("error") or email.get("reason"),
    )


@router.get("/tickets")
async def list_tickets(db: AsyncSession = Depends(get_db), limit: int = 20):
    result = await db.execute(
        select(SupportTicket).order_by(SupportTicket.created_at.desc()).limit(limit)
    )
    return [_to_response(t) for t in result.scalars().all()]


@router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: UUID, db: AsyncSession = Depends(get_db)):
    ticket = await db.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return _to_response(ticket)


@router.post("/complaints", response_model=TicketResponse, status_code=201)
async def submit_customer_complaint(body: CustomerComplaint, db: AsyncSession = Depends(get_db)):
    """Customer-facing endpoint — processes ticket and emails the AI response."""
    full_body = body.body
    if body.customer_name:
        full_body = f"From: {body.customer_name}\n\n{body.body}"

    ticket, result = await process_support_ticket(
        db,
        subject=body.subject,
        body=full_body,
        customer_email=str(body.customer_email),
        priority="medium",
        source="customer_portal",
    )
    return _to_response(ticket, result)


@router.post("/tickets", response_model=TicketResponse, status_code=201)
async def create_ticket(ticket: TicketCreate, db: AsyncSession = Depends(get_db)):
    """Internal / ops endpoint — optional email for reply delivery."""
    record, result = await process_support_ticket(
        db,
        subject=ticket.subject,
        body=ticket.body or "",
        customer_email=str(ticket.customer_email) if ticket.customer_email else None,
        priority=ticket.priority,
        external_id=ticket.external_id,
        source="ops_dashboard",
    )
    return _to_response(record, result)
