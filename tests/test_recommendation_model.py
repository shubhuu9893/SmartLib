"""Comprehensive test suite for the TF-IDF + Cosine Similarity Recommendation Model.

Validates all 6 personalization signals:
1. Interests
2. Favorites
3. Ratings (positive and negative weights)
4. My Library (status-based weights)
5. Reading history
6. Search history

Also tests:
- Cosine similarity ranking
- Exclusion of consumed books
- Book-to-book recommendations ("Because You Like")
- Author extraction
- Explanation generation
- Cold start handling
"""

from typing import List
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from backend.app.database.connection import Base
from backend.app.database.models import (
    Book,
    Favorite,
    LibraryEntry,
    Rating,
    ReadingHistory,
    SearchHistory,
    User,
    UserInterest,
)
from backend.app.recommendation.personalized import (
    build_user_profile,
    personalized_recommendations,
)
from backend.app.recommendation.recommender import BookRecommender
from backend.app.recommendation.preprocessing import create_book_text, create_profile_text


@pytest.fixture(scope="function")
def db_session() -> Session:
    engine = create_engine("sqlite:///:memory:", echo=False, future=True)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
    session: Session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _create_user(session: Session, uid: str = "uid_123") -> User:
    user = User(firebase_uid=uid, name="Alice", email="alice@example.com")
    session.add(user)
    session.flush()
    return user


def _seed_catalog(session: Session) -> List[Book]:
    books = [
        Book(
            id=1,
            title="Deep Learning with Python",
            author="François Chollet",
            category="Technology",
            description="Practical deep learning and neural networks using Keras and Python.",
            keywords="deep learning,neural networks,python,machine learning,ai",
            ratings_average=4.8,
            ratings_count=120,
        ),
        Book(
            id=2,
            title="Artificial Intelligence: A Modern Approach",
            author="Stuart Russell, Peter Norvig",
            category="Technology",
            description="The leading comprehensive textbook in artificial intelligence.",
            keywords="ai,machine learning,algorithms,computer science",
            ratings_average=4.7,
            ratings_count=350,
        ),
        Book(
            id=3,
            title="Dune",
            author="Frank Herbert",
            category="Science Fiction",
            description="Epic sci-fi masterpiece set in the desert planet Arrakis.",
            keywords="sci-fi,space,spice,arrakis,empire,sandworms",
            ratings_average=4.6,
            ratings_count=500,
        ),
        Book(
            id=4,
            title="Foundation",
            author="Isaac Asimov",
            category="Science Fiction",
            description="Galactic empire collapses and psychohistory tries to save civilization.",
            keywords="sci-fi,space,psychohistory,galaxy,future,empire",
            ratings_average=4.5,
            ratings_count=400,
        ),
        Book(
            id=5,
            title="A History of Modern Computing",
            author="Paul Ceruzzi",
            category="History",
            description="History of computing from early mainframes to smartphones.",
            keywords="history,computers,technology,innovation,silicon valley",
            ratings_average=4.2,
            ratings_count=45,
        ),
        Book(
            id=6,
            title="Guns, Germs, and Steel",
            author="Jared Diamond",
            category="History",
            description="A short history of everybody for the last 13,000 years.",
            keywords="history,anthropology,civilization,human society",
            ratings_average=4.3,
            ratings_count=310,
        ),
        Book(
            id=7,
            title="The Republic",
            author="Plato",
            category="Philosophy",
            description="Socratic dialogue on justice, the order of the city-state, and the just human.",
            keywords="philosophy,ethics,justice,ancient greece,politics",
            ratings_average=4.1,
            ratings_count=200,
        ),
    ]
    session.add_all(books)
    session.commit()
    return books


def test_recommender_book_to_book(db_session: Session):
    """Test finding books similar to a given book via TF-IDF cosine similarity."""
    books = _seed_catalog(db_session)
    recommender = BookRecommender()
    recommender.train(books)

    # Book 1 (Deep Learning with Python) should be most similar to Book 2 (AI: Modern Approach)
    similar = recommender.recommend(book_id=1, top_n=3)
    assert len(similar) > 0
    top_match = similar[0]
    assert top_match["id"] == 2
    assert top_match["score"] > 0.0
    assert top_match["id"] != 1  # Self should never be recommended


def test_interests_signal(db_session: Session):
    """Test recommendations driven by explicit user interests."""
    books = _seed_catalog(db_session)
    user = _create_user(db_session)

    # Add interest in Science Fiction
    interest = UserInterest(user_id=user.id, interest="Science Fiction space")
    db_session.add(interest)
    db_session.commit()

    result = personalized_recommendations(db_session, user, limit=2, as_dict=True)

    assert result["has_signals"] is True
    assert len(result["items"]) == 2
    # Top results should be sci-fi books (Dune / Foundation)
    top_ids = [item["id"] for item in result["items"]]
    assert 3 in top_ids or 4 in top_ids
    # Explanations should cite interest
    assert any("interest" in item.get("reason", "").lower() for item in result["items"])


def test_search_history_signal(db_session: Session):
    """Test recommendations driven by search queries."""
    books = _seed_catalog(db_session)
    user = _create_user(db_session)

    search = SearchHistory(user_id=user.id, query="neural networks deep learning")
    db_session.add(search)
    db_session.commit()

    result = personalized_recommendations(db_session, user, limit=2, as_dict=True)
    assert result["has_signals"] is True
    top_item = result["items"][0]
    assert top_item["id"] == 1  # Deep Learning with Python
    assert "search" in top_item["reason"].lower()


def test_favorites_and_consumed_exclusion(db_session: Session):
    """Test that favorited books influence recommendations and are excluded from candidates."""
    books = _seed_catalog(db_session)
    user = _create_user(db_session)

    # Favorite Book 3 (Dune)
    fav = Favorite(user_id=user.id, book_id=3)
    db_session.add(fav)
    db_session.commit()

    result = personalized_recommendations(db_session, user, limit=3, as_dict=True)

    recommended_ids = [item["id"] for item in result["items"]]
    # Favorited book (3) must be excluded
    assert 3 not in recommended_ids
    # Similar book (4: Foundation) should be recommended top
    assert recommended_ids[0] == 4


def test_ratings_positive_and_negative(db_session: Session):
    """Test that high ratings boost related topics and low ratings subtract influence."""
    books = _seed_catalog(db_session)
    user = _create_user(db_session)

    # High rating for History (Book 6: Guns, Germs, and Steel -> 5 stars)
    # Low rating for Sci-Fi (Book 3: Dune -> 1 star)
    db_session.add(Rating(user_id=user.id, book_id=6, rating=5))
    db_session.add(Rating(user_id=user.id, book_id=3, rating=1))
    db_session.commit()

    result = personalized_recommendations(db_session, user, limit=3, as_dict=True)
    recommended_ids = [item["id"] for item in result["items"]]

    # Consumed books 6 and 3 must be excluded
    assert 6 not in recommended_ids
    assert 3 not in recommended_ids

    # History of Computing (Book 5) should rank higher than Foundation (Book 4)
    if 5 in recommended_ids and 4 in recommended_ids:
        assert recommended_ids.index(5) < recommended_ids.index(4)


def test_library_and_reading_history(db_session: Session):
    """Test that library entries and reading history shape profile and exclude consumed books."""
    books = _seed_catalog(db_session)
    user = _create_user(db_session)

    # Currently reading Book 1 (Deep Learning)
    lib = LibraryEntry(user_id=user.id, book_id=1, status="reading", progress=40)
    # Read Book 5 in the past
    hist = ReadingHistory(user_id=user.id, book_id=5, action="read")
    db_session.add_all([lib, hist])
    db_session.commit()

    result = personalized_recommendations(db_session, user, limit=2, as_dict=True)
    recommended_ids = [item["id"] for item in result["items"]]

    # Consumed books must be excluded
    assert 1 not in recommended_ids
    assert 5 not in recommended_ids
    # AI textbook (Book 2) should be recommended top
    assert recommended_ids[0] == 2


def test_cold_start_empty_signals(db_session: Session):
    """Test user with no signals receives empty list and has_signals=False."""
    books = _seed_catalog(db_session)
    user = _create_user(db_session)

    result = personalized_recommendations(db_session, user, limit=10, as_dict=True)
    assert result["has_signals"] is False
    assert result["items"] == []
    assert result["because"] == []
    assert result["authors"] == []


def test_because_you_like_carousels(db_session: Session):
    """Test generation of 'Because You Like' carousel groups."""
    books = _seed_catalog(db_session)
    user = _create_user(db_session)

    # Favorite Book 1
    db_session.add(Favorite(user_id=user.id, book_id=1))
    db_session.commit()

    result = personalized_recommendations(db_session, user, limit=5, as_dict=True)
    assert len(result["because"]) > 0
    group = result["because"][0]
    assert group["seed"]["id"] == 1
    assert len(group["items"]) > 0
    # Group items should contain similar books like Book 2
    item_ids = [b["id"] for b in group["items"]]
    assert 2 in item_ids
