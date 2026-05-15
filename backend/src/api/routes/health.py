from fastapi import APIRouter
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    return {"status": "healthy", "service": "ascent-platform"}


@router.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
