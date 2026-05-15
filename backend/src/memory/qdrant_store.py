from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid5, NAMESPACE_DNS

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

from src.core.config import get_settings
from src.core.logging import get_logger
from src.llm.router import get_llm_router

logger = get_logger(__name__)

COLLECTIONS = {
    "incidents": "incidents_collection",
    "support": "support_collection",
    "research": "research_collection",
    "workflows": "workflow_collection",
}


def _qdrant_point_id(record_id: str) -> str:
    """Qdrant accepts UUID strings or unsigned integers — normalize arbitrary ids."""
    try:
        return str(UUID(record_id))
    except ValueError:
        return str(uuid5(NAMESPACE_DNS, record_id))


class SemanticMemoryStore:
    def __init__(self):
        self._client: AsyncQdrantClient | None = None

    async def connect(self) -> None:
        settings = get_settings()
        self._client = AsyncQdrantClient(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key,
            check_compatibility=False,
        )
        await self._ensure_collections()

    async def disconnect(self) -> None:
        if self._client:
            await self._client.close()

    async def _ensure_collections(self) -> None:
        assert self._client is not None
        settings = get_settings()
        for name in COLLECTIONS.values():
            collections = await self._client.get_collections()
            existing = {c.name for c in collections.collections}
            if name not in existing:
                await self._client.create_collection(
                    collection_name=name,
                    vectors_config=VectorParams(
                        size=settings.embedding_dimension,
                        distance=Distance.COSINE,
                    ),
                )
                logger.info("qdrant_collection_created", collection=name)

    async def store(
        self,
        collection_key: str,
        record_id: str,
        text: str,
        metadata: dict[str, Any],
    ) -> None:
        assert self._client is not None
        collection = COLLECTIONS[collection_key]
        router = get_llm_router()
        vector = await router.embed(text)
        payload = {**metadata, "text": text, "indexed_at": datetime.now(timezone.utc).isoformat()}
        await self._client.upsert(
            collection_name=collection,
            points=[PointStruct(id=_qdrant_point_id(record_id), vector=vector, payload=payload)],
        )

    async def search_similar(
        self,
        collection_key: str,
        query: str,
        limit: int = 5,
        filters: dict[str, str] | None = None,
    ) -> list[dict[str, Any]]:
        assert self._client is not None
        collection = COLLECTIONS[collection_key]
        router = get_llm_router()
        try:
            vector = await router.embed(query)
        except Exception as e:
            logger.warning("qdrant_embed_failed", collection=collection, error=str(e))
            return []

        qdrant_filter = None
        if filters:
            conditions = [
                FieldCondition(key=k, match=MatchValue(value=v)) for k, v in filters.items()
            ]
            qdrant_filter = Filter(must=conditions)

        response = await self._client.query_points(
            collection_name=collection,
            query=vector,
            limit=limit,
            query_filter=qdrant_filter,
        )
        return [
            {
                "id": str(r.id),
                "score": r.score,
                "payload": r.payload,
            }
            for r in response.points
        ]

    async def store_incident_memory(
        self,
        incident_id: UUID,
        summary: str,
        service: str | None,
        severity: str,
        root_cause: str | None,
    ) -> None:
        text = f"Incident {incident_id}: {summary}. Root cause: {root_cause or 'unknown'}"
        await self.store(
            "incidents",
            str(incident_id),
            text,
            {
                "incident_id": str(incident_id),
                "service": service or "unknown",
                "severity": severity,
                "root_cause": root_cause or "",
            },
        )

    async def find_similar_incidents(
        self, query: str, service: str | None = None, limit: int = 5
    ) -> list[dict[str, Any]]:
        filters = {"service": service} if service else None
        return await self.search_similar("incidents", query, limit=limit, filters=filters)


_memory: SemanticMemoryStore | None = None


async def get_memory_store() -> SemanticMemoryStore:
    global _memory
    if _memory is None:
        _memory = SemanticMemoryStore()
        await _memory.connect()
    return _memory
