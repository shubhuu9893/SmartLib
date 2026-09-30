import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database.schema import ensure_schema

from .api.auth import router as auth_router
from .api.books import router as books_router
from .api.catalog import router as catalog_router
from .api.favorites import router as favorites_router
from .api.library import router as library_router
from .api.notifications import router as notifications_router
from .api.ratings import router as ratings_router
from .api.recommendations import router as recommendations_router
from .api.users import router as users_router


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Smart E-Library Backend",
    version="0.1.0",
)


# ---------------------------------------------------------------------------
# Database schema
# ---------------------------------------------------------------------------

# The original project eagerly called ``ensure_schema`` during module import. This
# caused an immediate HTTP request to Cloudflare D1 when the FastAPI app was
# instantiated, and it resulted in a 403 error if the API token lacked the
# necessary permissions. Instead we defer schema creation until the application
# startup event so that it runs only after the ASGI server has fully loaded and
# any runtime configuration (e.g. logging) is available.

import logging

logger = logging.getLogger(__name__)


@app.on_event("startup")
def _on_startup() -> None:
    """Run database schema migrations and perform basic sanity checks.

    The function is intentionally lightweight; it merely calls
    :func:`ensure_schema` from ``app.database.schema``. Any exception will be
    logged and re‑raised to stop the application from running with an invalid
    schema configuration. This mirrors the behaviour that developers would expect
    when starting a FastAPI service – a crash during startup clearly indicates a
    misconfiguration.
    """

    try:
        ensure_schema()
    except Exception as exc:  # pragma: no cover - defensive error path
        logger.exception("Failed to initialise database schema: %s", exc)
        raise

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# API Routers
# ---------------------------------------------------------------------------

app.include_router(books_router)
app.include_router(recommendations_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(catalog_router)
app.include_router(favorites_router)
app.include_router(ratings_router)
app.include_router(library_router)
app.include_router(notifications_router)


# ---------------------------------------------------------------------------
# Root endpoint
# ---------------------------------------------------------------------------

@app.get("/")
async def read_root():
    return {
        "message": "Smart E-Library API is running"
    }