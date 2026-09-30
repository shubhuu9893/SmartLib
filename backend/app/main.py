<<<<<<< HEAD
import os
=======
"""FastAPI application entry point.

The module wires all routers, database connection, middleware and
environment configuration together. It is deliberately minimal but fully
functional – the rest of the codebase lives in sub‑packages under ``app``.
"""
>>>>>>> 1e990c53 (start)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

<<<<<<< HEAD
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
=======
# Import configuration utilities
from .core.config import Settings, get_settings
from .db.database import Base, engine, SessionLocal, init_models

# Import routers
from .api.routes.auth import router as auth_router
from .api.routes.books import router as books_router
from .api.routes.health import router as health_router
from .api.routes.recommendations import router as recommendations_router
>>>>>>> 1e990c53 (start)

# ---------------------------------------------------------------------------
# Database table creation.
# ``create_all`` cannot be used with an async engine.  Instead we perform the
# migration inside a startup event handler using the async ``init_models``
# helper defined in :mod:`app.db.database`.
# ---------------------------------------------------------------------------

<<<<<<< HEAD
ensure_schema()
=======
app = FastAPI(title="Smart E‑Library Backend", version="0.1.0")
>>>>>>> 1e990c53 (start)

# ---------------------------------------------------------------------------
# Startup / shutdown event handlers
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup():  # pragma: no cover – exercised implicitly by uvicorn
    """Create database tables on application start‑up.

    The async helper ``init_models`` performs the migration using an async
    connection context.  This ensures the engine is fully initialised before any
    request handlers run and avoids creating tables on every request.
    """
    await init_models()

@app.on_event("shutdown")
async def shutdown():  # pragma: no cover – exercised implicitly by uvicorn
    """Dispose of the async engine when FastAPI shuts down."""
    await engine.dispose()

# Apply CORS configuration based on environment variables.
settings: Settings = get_settings()
allowed_origins = (
    [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
    if settings.CORS_ORIGINS
    else []
)

app.add_middleware(
    CORSMiddleware,
<<<<<<< HEAD
    allow_origins=[
        o.strip()
        for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
        if o.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(books_router)

app.include_router(
    recommendations_router
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(catalog_router)
app.include_router(favorites_router)
app.include_router(ratings_router)
app.include_router(library_router)
app.include_router(notifications_router)

=======
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Register routers – order matters for path prefixes
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(books_router, prefix="/api/books", tags=["books"])
app.include_router(recommendations_router, prefix="/api/recommendations", tags=["recommendations"])
app.include_router(health_router, prefix="/api/health", tags=["health"])
>>>>>>> 1e990c53 (start)

# Simple root endpoint for quick sanity check
@app.get("/")
async def read_root():  # pragma: no cover – trivial endpoint
    return {"message": "Smart E‑Library API is running"}