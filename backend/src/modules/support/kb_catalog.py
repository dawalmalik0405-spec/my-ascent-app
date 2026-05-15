"""Northwind-style support KB: curated JSON + lexical retrieval + Qdrant seeding."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

from src.core.logging import get_logger
from src.memory.qdrant_store import SemanticMemoryStore

logger = get_logger(__name__)

_KB_PATH = Path(__file__).resolve().parent / "support_kb.json"


@lru_cache(maxsize=1)
def load_kb_entries() -> tuple[dict[str, Any], ...]:
    if not _KB_PATH.exists():
        logger.warning("support_kb_missing", path=str(_KB_PATH))
        return ()
    raw = json.loads(_KB_PATH.read_text(encoding="utf-8"))
    return tuple(raw) if isinstance(raw, list) else ()


def _tokens(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", text.lower()) if len(t) > 2}


def entry_embed_text(entry: dict[str, Any]) -> str:
    symptoms = entry.get("symptoms") or []
    sym = " ".join(symptoms) if isinstance(symptoms, list) else str(symptoms)
    return (
        f"{entry.get('title', '')}. Typical complaints: {sym}. "
        f"Recommended resolution: {entry.get('solution', '')}"
    )


def lexical_rank_kb(subject: str, body: str, limit: int = 5) -> list[dict[str, Any]]:
    """Rank KB articles by token overlap with ticket text (works without semantic embeddings)."""
    entries = load_kb_entries()
    if not entries:
        return []

    query_tokens = _tokens(f"{subject} {body}")
    scored: list[tuple[dict[str, Any], float]] = []
    for entry in entries:
        blob = entry_embed_text(entry)
        overlap = len(query_tokens & _tokens(blob))
        denom = max(len(query_tokens), 1)
        score = overlap / denom
        scored.append((entry, score))

    scored.sort(key=lambda x: x[1], reverse=True)

    if not scored or scored[0][1] <= 0:
        picked = list(entries[:limit])
    else:
        picked = [e for e, s in scored if s > 0][:limit]
        if len(picked) < limit:
            seen = {p["id"] for p in picked}
            for e, _ in scored:
                if e["id"] not in seen:
                    picked.append(e)
                    seen.add(e["id"])
                if len(picked) >= limit:
                    break

    out: list[dict[str, Any]] = []
    for entry in picked[:limit]:
        blob = entry_embed_text(entry)
        score = next((s for e, s in scored if e["id"] == entry["id"]), 0.0)
        out.append(
            {
                "id": entry["id"],
                "score": float(score),
                "payload": {
                    "kb_id": entry["id"],
                    "category": entry.get("category"),
                    "title": entry.get("title"),
                    "solution": entry.get("solution"),
                    "symptoms": entry.get("symptoms"),
                    "text": blob,
                    "source": "support_kb_dataset",
                },
            }
        )
    return out


async def seed_support_kb_to_qdrant(memory: SemanticMemoryStore) -> int:
    """Upsert all KB rows into Qdrant for optional vector/hybrid use."""
    entries = load_kb_entries()
    if not entries:
        return 0
    n = 0
    for entry in entries:
        await memory.store(
            "support",
            entry["id"],
            entry_embed_text(entry),
            {
                "kb_id": entry["id"],
                "category": entry.get("category"),
                "title": entry.get("title"),
                "solution": entry.get("solution"),
                "source": "support_kb_dataset",
            },
        )
        n += 1
    logger.info("support_kb_seeded_qdrant", articles=n)
    return n


def merge_kb_hits(
    lexical: list[dict[str, Any]],
    vector: list[dict[str, Any]],
    limit: int = 5,
) -> list[dict[str, Any]]:
    """Prefer lexical matches; fill with vector hits without duplicate kb ids."""
    seen: set[str] = set()
    merged: list[dict[str, Any]] = []

    for hit in lexical:
        if len(merged) >= limit:
            break
        kb_id = (hit.get("payload") or {}).get("kb_id") or hit.get("id")
        key = str(kb_id)
        if key in seen:
            continue
        seen.add(key)
        merged.append(hit)

    for hit in vector:
        payload = hit.get("payload") or {}
        kb_id = payload.get("kb_id") or hit.get("id")
        key = str(kb_id)
        if key in seen:
            continue
        seen.add(key)
        enriched = {
            **hit,
            "payload": {
                **payload,
                "source": payload.get("source", "qdrant_vector"),
            },
        }
        merged.append(enriched)
        if len(merged) >= limit:
            break

    return merged[:limit]
