"""
Ecommerce-style demo store for Ascent incident testing.

Flow: storefront → cart → POST /checkout. Trip checkout sets gauge → Prometheus → Alertmanager → Ascent.

Customer support: /support submits to Ascent POST /api/v1/support/complaints (configure ASCENT_API_BASE_URL;
in Docker default is host.docker.internal:8000). Tickets appear on Ascent UI /support; reply email uses API SMTP settings.

Templates + static assets ship alongside this file (see Dockerfile).
"""

from __future__ import annotations

import os
import uuid
from pathlib import Path
from urllib.parse import quote

import httpx
from fastapi import FastAPI, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, generate_latest

BASE_DIR = Path(__file__).resolve().parent

PRODUCTS: list[dict] = [
    {
        "id": "nw-bag-01",
        "name": "Aurora Canvas Tote",
        "price": 48.0,
        "emoji": "🎒",
        "blurb": "14oz cotton, leather handles — daily carry.",
        "badge": "Best seller",
    },
    {
        "id": "nw-mug-02",
        "name": "Kiln Mug — Speckle",
        "price": 32.0,
        "emoji": "☕",
        "blurb": "Hand-dipped glaze, microwave safe.",
        "badge": None,
    },
    {
        "id": "nw-desk-03",
        "name": "Walnut Desk Tray",
        "price": 64.0,
        "emoji": "🪵",
        "blurb": "Solid walnut, cork base, cable notch.",
        "badge": "New",
    },
    {
        "id": "nw-lamp-04",
        "name": "Brass Reading Lamp",
        "price": 118.0,
        "emoji": "💡",
        "blurb": "Warm 2700K LED, dimmer on base.",
        "badge": None,
    },
    {
        "id": "nw-rug-05",
        "name": "Jute Runner 2×6",
        "price": 95.0,
        "emoji": "🟤",
        "blurb": "Low profile, pets & high traffic friendly.",
        "badge": None,
    },
    {
        "id": "nw-set-06",
        "name": "Linen Napkin Set (4)",
        "price": 36.0,
        "emoji": "🍽️",
        "blurb": "Stone-washed oatmeal, gift-ready.",
        "badge": "Sale",
    },
]

app = FastAPI(title="Northwind Goods (demo)", version="2.0.0")

templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# Ascent API (host machine when demo runs in Docker; same host when running uvicorn locally).
ASCENT_API_BASE_URL = os.environ.get("ASCENT_API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")

_checkout_broken: bool = False

checkout_broken = Gauge(
    "demo_webapp_checkout_broken",
    "Checkout path broken after simulated deploy (1=yes, 0=no).",
)

checkout_requests_total = Counter(
    "demo_webapp_checkout_requests_total",
    "Checkout HTTP responses",
    ["status"],
)


class CheckoutBody(BaseModel):
    items: list[dict] = Field(default_factory=list)


def _checkout_success_payload() -> dict:
    oid = f"NW-{uuid.uuid4().hex[:8].upper()}"
    return {"ok": True, "order_id": oid, "message": "Thank you — your order is confirmed."}


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        request,
        "index.html",
        {"featured": PRODUCTS[:3]},
    )


@app.get("/shop", response_class=HTMLResponse)
async def shop(request: Request):
    return templates.TemplateResponse(
        request,
        "shop.html",
        {"products": PRODUCTS},
    )


@app.get("/cart", response_class=HTMLResponse)
async def cart_page(request: Request):
    return templates.TemplateResponse(request, "cart.html", {})


@app.get("/support", response_class=HTMLResponse)
async def support_page(request: Request):
    return templates.TemplateResponse(
        request,
        "support.html",
        {
            "err": request.query_params.get("err"),
            "ok": request.query_params.get("ok"),
            "ascent_api_base": ASCENT_API_BASE_URL,
        },
    )


@app.post("/support")
async def support_submit(
    customer_email: str = Form(...),
    customer_name: str | None = Form(None),
    subject: str = Form(...),
    body: str = Form(...),
):
    """Forward complaint to Ascent support module (same path as dashboard /complain)."""
    subject = subject.strip()
    body = body.strip()
    customer_email = customer_email.strip()
    if len(subject) < 3 or len(subject) > 500:
        return RedirectResponse(
            url=f"/support?err={quote('Subject must be between 3 and 500 characters.')}",
            status_code=303,
        )
    if len(body) < 10 or len(body) > 8000:
        return RedirectResponse(
            url=f"/support?err={quote('Message must be between 10 and 8000 characters.')}",
            status_code=303,
        )
    payload: dict = {
        "customer_email": customer_email,
        "subject": subject,
        "body": body,
    }
    if customer_name and customer_name.strip():
        payload["customer_name"] = customer_name.strip()

    url = f"{ASCENT_API_BASE_URL}/api/v1/support/complaints"
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(url, json=payload)
    except httpx.ConnectError as e:
        return RedirectResponse(
            url=f"/support?err={quote(f'Cannot reach Ascent API at {ASCENT_API_BASE_URL}. Is the platform running on :8000? ({e})')}",
            status_code=303,
        )
    except httpx.TimeoutException:
        return RedirectResponse(
            url=f"/support?err={quote('Ascent took too long to respond (LLM/support pipeline). Try again in a moment.')}",
            status_code=303,
        )

    if r.status_code >= 400:
        detail = r.text[:300] if r.text else r.reason_phrase
        return RedirectResponse(
            url=f"/support?err={quote(f'Ascent returned {r.status_code}: {detail}')}",
            status_code=303,
        )

    return RedirectResponse(url="/support?ok=submitted", status_code=303)


@app.get("/api/products")
async def api_products():
    return {"products": PRODUCTS}


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "northwind-demo-store"}


@app.get("/checkout")
async def checkout_get():
    """Simple GET for probes; same failure mode as POST when tripped."""
    if _checkout_broken:
        checkout_requests_total.labels(status="500").inc()
        raise HTTPException(status_code=500, detail="checkout_unavailable")
    checkout_requests_total.labels(status="200").inc()
    return _checkout_success_payload()


@app.post("/checkout")
async def checkout_post(body: CheckoutBody):
    """Realistic path: browser sends cart JSON from checkout page."""
    if _checkout_broken:
        checkout_requests_total.labels(status="500").inc()
        raise HTTPException(status_code=500, detail="checkout_unavailable")
    checkout_requests_total.labels(status="200").inc()
    return _checkout_success_payload()


@app.post("/admin/trip")
async def trip():
    global _checkout_broken
    _checkout_broken = True
    checkout_broken.set(1)
    return {
        "status": "broken",
        "hint": "Checkout will 500. Prometheus alert ~30–60s → Ascent incident.",
    }


@app.post("/admin/heal")
async def heal():
    global _checkout_broken
    _checkout_broken = False
    checkout_broken.set(0)
    return {"status": "healthy"}


@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
