import json
import uuid
from datetime import datetime, timezone
from typing import Any

import redis.asyncio as redis
from tenacity import retry, stop_after_attempt, wait_exponential

from src.core.config import get_settings
from src.core.logging import get_logger

logger = get_logger(__name__)

STREAMS = {
    "alerts": "stream:alerts",
    "incidents": "stream:incidents",
    "support": "stream:support",
    "research": "stream:research",
    "workflows": "stream:workflows",
    "dlq": "stream:dlq",
}

CONSUMER_GROUPS = {
    "incident-processor": ["stream:alerts", "stream:incidents"],
    "support-processor": ["stream:support"],
    "correlation-engine": ["stream:incidents", "stream:support", "stream:research"],
}


class EventBus:
    def __init__(self, redis_client: redis.Redis | None = None):
        self._client = redis_client
        self._owns_client = redis_client is None

    async def connect(self) -> None:
        if self._client is None:
            settings = get_settings()
            self._client = redis.from_url(settings.redis_url, decode_responses=True)
        await self._ensure_consumer_groups()

    async def disconnect(self) -> None:
        if self._owns_client and self._client:
            await self._client.aclose()

    async def _ensure_consumer_groups(self) -> None:
        assert self._client is not None
        for group, streams in CONSUMER_GROUPS.items():
            for stream in streams:
                try:
                    await self._client.xgroup_create(stream, group, id="0", mkstream=True)
                except redis.ResponseError as e:
                    if "BUSYGROUP" not in str(e):
                        raise

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=0.5, max=8))
    async def publish(self, stream_key: str, event_type: str, payload: dict[str, Any]) -> str:
        assert self._client is not None
        stream = STREAMS.get(stream_key, stream_key)
        event_id = str(uuid.uuid4())
        message = {
            "event_id": event_id,
            "event_type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": json.dumps(payload),
        }
        msg_id = await self._client.xadd(stream, message)
        logger.info("event_published", stream=stream, event_type=event_type, msg_id=msg_id)
        await self._client.publish(f"channel:{stream_key}", json.dumps({**message, "stream": stream}))
        return msg_id

    async def move_to_dlq(self, original_stream: str, event: dict, error: str) -> None:
        await self.publish(
            "dlq",
            "dead_letter",
            {
                "original_stream": original_stream,
                "original_event": event,
                "error": error,
            },
        )

    async def subscribe_channel(self, stream_key: str):
        assert self._client is not None
        pubsub = self._client.pubsub()
        await pubsub.subscribe(f"channel:{stream_key}")
        return pubsub


_event_bus: EventBus | None = None


async def get_event_bus() -> EventBus:
    global _event_bus
    if _event_bus is None:
        _event_bus = EventBus()
        await _event_bus.connect()
    return _event_bus
