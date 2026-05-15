import enum
import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum as SAEnum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


def _pg_enum(enum_class: type[enum.Enum], pg_name: str):
    """PostgreSQL enums use lowercase values (critical), not Python names (CRITICAL)."""
    return SAEnum(
        enum_class,
        name=pg_name,
        values_callable=lambda choices: [c.value for c in choices],
        native_enum=True,
        create_constraint=False,
    )


class IncidentStatus(str, enum.Enum):
    RECEIVED = "received"
    TRIAGING = "triaging"
    CORRELATING = "correlating"
    INVESTIGATING = "investigating"
    PLANNING = "planning"
    AWAITING_APPROVAL = "awaiting_approval"
    EXECUTING = "executing"
    VALIDATING = "validating"
    REPORTING = "reporting"
    RESOLVED = "resolved"
    CANCELLED = "cancelled"
    FAILED = "failed"


class IncidentSeverity(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class WorkflowStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    correlation_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(512))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[IncidentSeverity] = mapped_column(
        _pg_enum(IncidentSeverity, "incident_severity"),
        default=IncidentSeverity.MEDIUM,
    )
    status: Mapped[IncidentStatus] = mapped_column(
        _pg_enum(IncidentStatus, "incident_status"),
        default=IncidentStatus.RECEIVED,
    )
    service: Mapped[str | None] = mapped_column(String(255), nullable=True)
    environment: Mapped[str] = mapped_column(String(64), default="production")
    alert_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    root_cause: Mapped[str | None] = mapped_column(Text, nullable=True)
    remediation_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    temporal_workflow_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    langgraph_thread_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    incident_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    events: Mapped[list["IncidentEvent"]] = relationship(back_populates="incident", lazy="selectin")


class IncidentEvent(Base):
    __tablename__ = "incident_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidents.id", ondelete="CASCADE"))
    event_type: Mapped[str] = mapped_column(String(128))
    agent_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    trace_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    incident: Mapped["Incident"] = relationship(back_populates="events")


class Workflow(Base):
    __tablename__ = "workflows"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    module: Mapped[str] = mapped_column(String(64))
    temporal_workflow_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    temporal_run_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[WorkflowStatus] = mapped_column(
        _pg_enum(WorkflowStatus, "workflow_status"),
        default=WorkflowStatus.PENDING,
    )
    input_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    output_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    incident_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("incidents.id"), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    steps: Mapped[list["WorkflowStep"]] = relationship(back_populates="workflow", lazy="selectin")


class WorkflowStep(Base):
    __tablename__ = "workflow_steps"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workflows.id", ondelete="CASCADE"))
    step_name: Mapped[str] = mapped_column(String(128))
    agent_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(64), default="pending")
    attempt: Mapped[int] = mapped_column(Integer, default=0)
    input_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    output_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    trace_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workflow: Mapped["Workflow"] = relationship(back_populates="steps")


class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workflows.id", ondelete="CASCADE"))
    incident_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("incidents.id"), nullable=True)
    action_type: Mapped[str] = mapped_column(String(128))
    action_payload: Mapped[dict] = mapped_column(JSON)
    risk_level: Mapped[str] = mapped_column(String(32), default="high")
    status: Mapped[ApprovalStatus] = mapped_column(
        _pg_enum(ApprovalStatus, "approval_status"),
        default=ApprovalStatus.PENDING,
    )
    requested_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    approved_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    subject: Mapped[str] = mapped_column(String(512))
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(128), nullable=True)
    priority: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(String(64), default="open")
    correlated_incident_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("incidents.id"), nullable=True
    )
    ticket_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ResearchSignal(Base):
    __tablename__ = "research_signals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    source: Mapped[str] = mapped_column(String(128))
    title: Mapped[str] = mapped_column(String(512))
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    signal_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    relevance_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    correlated_incident_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("incidents.id"), nullable=True
    )
    signal_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
