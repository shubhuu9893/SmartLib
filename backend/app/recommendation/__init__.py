"""Convenience module for the recommendation engine.

This file defines a *singleton* :class:`BookRecommender` that is created once when
the application starts.  It exposes a :func:`get_recommender` dependency that can
be used in FastAPI routes so callers do not need to worry about training the model
or re‑instantiating it on each request.
"""

from __future__ import annotations

from typing import Optional

# Import lazily to avoid circular imports when the module is first loaded.
from .train import train_recommender
from .recommender import BookRecommender
from ..database.connection import SessionLocal
from sqlalchemy.orm import Session

_global_recommender: Optional[BookRecommender] = None


def get_recommender(db: Optional[Session] = None) -> BookRecommender:
    """Return the singleton recommender instance.

    The first call creates a new database session, loads all books, trains the
    TF‑IDF model and caches the resulting :class:`BookRecommender`.  Subsequent
    calls simply return the cached object.
    """

    global _global_recommender

    # If a caller supplies its own database session we use that for training.
    if db is not None:
        return train_recommender(db)

    if _global_recommender is not None:
        return _global_recommender

    db = SessionLocal()
    try:
        _global_recommender = train_recommender(db)
    finally:
        db.close()
    return _global_recommender
