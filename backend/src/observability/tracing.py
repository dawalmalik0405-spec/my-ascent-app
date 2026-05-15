from contextlib import contextmanager
from typing import Generator
from uuid import uuid4

from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter

from src.core.config import get_settings
from src.core.logging import get_logger

logger = get_logger(__name__)
_tracer: trace.Tracer | None = None


def init_tracing() -> None:
    global _tracer
    settings = get_settings()
    resource = Resource.create(
        {
            "service.name": settings.otel_service_name,
            "service.version": "0.1.0",
        }
    )
    provider = TracerProvider(resource=resource)

    if settings.otel_exporter_otlp_endpoint:
        try:
            from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

            provider.add_span_processor(
                BatchSpanProcessor(OTLPSpanExporter(endpoint=settings.otel_exporter_otlp_endpoint))
            )
        except ImportError:
            logger.warning("otlp_exporter_unavailable")
    else:
        provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))

    trace.set_tracer_provider(provider)
    _tracer = trace.get_tracer(settings.otel_service_name)
    logger.info("tracing_initialized", service=settings.otel_service_name)


def get_tracer() -> trace.Tracer:
    global _tracer
    if _tracer is None:
        init_tracing()
    return _tracer or trace.get_tracer("ascent-platform")


@contextmanager
def trace_span(name: str, attributes: dict | None = None) -> Generator[str, None, None]:
    tracer = get_tracer()
    trace_id = str(uuid4())
    with tracer.start_as_current_span(name) as span:
        span.set_attribute("trace.id", trace_id)
        if attributes:
            for k, v in attributes.items():
                span.set_attribute(k, str(v))
        yield trace_id
