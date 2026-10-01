"""Unit tests for the personalized recommendation logic.

The test creates an in‑memory SQLite database, populates a small set of
records that exercise all signal types (favorites, ratings, library entries,
search history) and then calls :func:`personalized_recommendations`.  The
assertions verify that:

1. Books the user has already consumed are excluded from the results.
2. The function honours the ``limit`` argument.
3. Returned items contain the expected keys and have non‑negative scores.
"""

from __future__ import annotations

import datetime as _dt
from typing import List, Dict

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# Import the models and recommendation function.
from backend.app.database.connection import Base
from backend.app.database.models import (
    Book,
    User,
    Favorite,
    Rating,
    LibraryEntry,
    SearchHistory,
)
from backend.app.recommendation.personalized import personalized_recommendations


@pytest.fixture(scope="function")
def db_session() -> Session:
    """Create a fresh in‑memory database for the test module."""
    engine = create_engine("sqlite:///:memory:", echo=False, future=True)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
    session: Session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _create_user(session: Session) -> User:
    user = User(firebase_uid="testuid")
    session.add(user)
    session.flush()  # assign id
    return user


def _populate_books_and_signals(session: Session, user: User):
    """Add a small dataset with diverse signals.

    - Five books are created; the first three will be consumed by the user and
      therefore should be excluded from recommendations.  The last two are
      available for recommendation.
    """

    books: List[Book] = []
    # Book one – favorite (weight 3)
    books.append(
        Book(
            title="Book One",
            author="Author A",
            category="Fiction",
            description="A fascinating tale.",
            keywords="adventure,fiction,story",
            ratings_average=4.5,
            ratings_count=10,
        )
    )

    # Book two – rated 4 (weight 2)
    books.append(
        Book(
            title="Book Two",
            author="Author B",
            category="Non-fiction",
            description="An insightful read.",
            keywords="science,research,education",
            ratings_average=4.0,
            ratings_count=20,
        )
    )

    # Book three – library entry (completed) (weight 2)
    books.append(
        Book(
            title="Book Three",
            author="Author C",
            category="History",
            description="Historical facts.",
            keywords="history,war,politics",
            ratings_average=3.8,
            ratings_count=5,
        )
    )

    # Book four – candidate
    books.append(
        Book(
            title="Book Four",
            author="Author D",
            category="Technology",
            description="Tech trends.",
            keywords="technology,innovation,ai",
            ratings_average=4.2,
            ratings_count=15,
        )
    )

    # Book five – candidate
    books.append(
        Book(
            title="Book Five",
            author="Author E",
            category="Philosophy",
            description="Thoughts.",
            keywords="philosophy,ideas,ethics",
            ratings_average=3.9,
            ratings_count=8,
        )
    )

    session.add_all(books)
    session.flush()  # assign ids

    # Signals – associate books with user.
    favorite = Favorite(user_id=user.id, book_id=books[0].id)
    rating = Rating(user_id=user.id, book_id=books[1].id, rating=4)
    library_entry = LibraryEntry(
        user_id=user.id,
        book_id=books[2].id,
        status="completed",
        progress=100,
    )
    search_history = SearchHistory(user_id=user.id, query="technology")

    session.add_all([favorite, rating, library_entry, search_history])
    session.commit()

    return books


def test_personalized_recommendations_excludes_consumed(db_session: Session):
    user = _create_user(db_session)
    books = _populate_books_and_signals(db_session, user)

    # Run recommendation with a generous limit.
    result = personalized_recommendations(db_session, user, limit=10)

    # Books 1-3 should be excluded as they are already consumed by the user.
    consumed_ids = {books[0].id, books[1].id, books[2].id}
    returned_ids = {item["id"] for item in result}
    assert not returned_ids & consumed_ids

    # Result should only contain the candidate books.
    expected_candidate_ids = {books[3].id, books[4].id}
    assert returned_ids == expected_candidate_ids

    # All returned scores should be positive (or zero if similarity is negligible).
    for item in result:
        assert isinstance(item["score"], float)
        assert item["score"] >= 0.0


def test_personalized_recommendations_limit(db_session: Session):
    user = _create_user(db_session)
    books = _populate_books_and_signals(db_session, user)

    # Only one candidate expected.
    result = personalized_recommendations(db_session, user, limit=1)
    assert len(result) == 1
    assert result[0]["id"] in {books[3].id, books[4].id}
