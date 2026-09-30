"""SQLAlchemy async engine and session utilities.

Uses SQLAlchemy 2.x's ``create_async_engine`` with the ``asyncpg`` driver. The
module exposes a session factory that can be injected into FastAPI dependencies.
"""

from __future__ import annotations

import asyncio
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from ..core.config import get_settings

settings = get_settings()
engine: AsyncEngine = create_async_engine(settings.DATABASE_URL, echo=False)

# Base class for declarative models – all tables inherit from this.
class Base(DeclarativeBase):
    pass

# Session factory. ``expire_on_commit=False`` keeps objects alive after commit.
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def init_models():  # pragma: no cover – called on startup by FastAPI
    """Create database tables based on the models defined in ``app.db.models``."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
