"""Personalized SmartLib recommendation model.

Ranked with TF-IDF + cosine similarity over:
1. Interests (UserInterest records)
2. Favorites (Favorite records)
3. Ratings (Rating records: 1 to 5 stars)
4. My Library (LibraryEntry records: reading, completed, want_to_read, saved)
5. Reading History (ReadingHistory records)
6. Search History (SearchHistory queries)
"""

from typing import Any, Dict, List, Optional, Set

from .preprocessing import create_book_text, extract_item_text
from .recommender import BookRecommender


# ============================================================
# SIGNAL WEIGHTS
# ============================================================

INTEREST_WEIGHT = 3.0
FAVORITE_WEIGHT = 3.0
RATING_WEIGHT = 2.5
LIBRARY_WEIGHT = 1.5
READING_WEIGHT = 2.0
SEARCH_WEIGHT = 2.0

RATING_SCORES = {
    5: 1.0,
    4: 0.75,
    3: 0.0,
    2: -0.5,
    1: -1.0,
}

LIBRARY_STATUS_WEIGHTS = {
    "reading": 2.5,
    "completed": 2.0,
    "want_to_read": 1.5,
    "saved": 1.5,
}


# ============================================================
# HELPERS
# ============================================================

def _get_val(item: Any, field: str, default: Any = None) -> Any:
    if item is None:
        return default
    if isinstance(item, dict):
        return item.get(field, default)
    return getattr(item, field, default)


def _get_book_id(book: Any) -> Any:
    return _get_val(book, "id", _get_val(book, "book_id"))


def _extract_book(item: Any) -> Any:
    """Extract Book object from relationship wrapper or dictionary."""
    if item is None:
        return None
    book = _get_val(item, "book")
    if book is not None:
        return book
    return item


# ============================================================
# BUILD USER PROFILE
# ============================================================

def build_user_profile(
    interests: Optional[List[Any]] = None,
    favorites: Optional[List[Any]] = None,
    ratings: Optional[List[Any]] = None,
    library: Optional[List[Any]] = None,
    reading_history: Optional[List[Any]] = None,
    search_history: Optional[List[Any]] = None,
) -> Dict[str, Any]:
    """Construct weighted profile documents, exclusion set, and signal metadata."""
    profile_documents: List[str] = []
    profile_weights: List[float] = []
    excluded_book_ids: Set[Any] = set()
    signal_metadata: List[Dict[str, Any]] = []
    seed_books: List[Any] = []

    # 1. Interests
    for interest in interests or []:
        val = _get_val(interest, "interest") or _get_val(interest, "name") or _get_val(interest, "value")
        if not val and isinstance(interest, str):
            val = interest
        if not val:
            continue
        val_str = str(val).strip()
        if not val_str:
            continue

        profile_documents.append(val_str)
        profile_weights.append(INTEREST_WEIGHT)
        signal_metadata.append({
            "type": "interest",
            "value": val_str,
            "weight": INTEREST_WEIGHT,
        })

    # 2. Favorites
    for fav in favorites or []:
        book = _extract_book(fav)
        book_id = _get_book_id(book)
        if book_id is not None:
            excluded_book_ids.add(book_id)
            seed_books.append(book)

        text = create_book_text(book)
        if text:
            profile_documents.append(text)
            profile_weights.append(FAVORITE_WEIGHT)
            signal_metadata.append({
                "type": "favorite",
                "book_id": book_id,
                "title": _get_val(book, "title", ""),
                "weight": FAVORITE_WEIGHT,
            })

    # 3. Ratings
    for r in ratings or []:
        book = _extract_book(r)
        book_id = _get_book_id(book)
        if book_id is not None:
            excluded_book_ids.add(book_id)

        rating_val = _get_val(r, "rating", 0)
        try:
            rating_val = int(rating_val)
        except (ValueError, TypeError):
            continue

        multiplier = RATING_SCORES.get(rating_val, 0.0)
        if multiplier == 0.0:
            continue

        if rating_val >= 4 and book is not None:
            seed_books.append(book)

        text = create_book_text(book)
        if text:
            weight = RATING_WEIGHT * multiplier
            profile_documents.append(text)
            profile_weights.append(weight)
            signal_metadata.append({
                "type": "rating",
                "book_id": book_id,
                "title": _get_val(book, "title", ""),
                "rating": rating_val,
                "weight": weight,
            })

    # 4. Library Entries
    for entry in library or []:
        book = _extract_book(entry)
        book_id = _get_book_id(book)
        if book_id is not None:
            excluded_book_ids.add(book_id)

        status = str(_get_val(entry, "status", "saved")).lower()
        weight = LIBRARY_STATUS_WEIGHTS.get(status, LIBRARY_WEIGHT)

        if status == "reading" and book is not None:
            seed_books.insert(0, book)

        text = create_book_text(book)
        if text:
            profile_documents.append(text)
            profile_weights.append(weight)
            signal_metadata.append({
                "type": "library",
                "book_id": book_id,
                "title": _get_val(book, "title", ""),
                "status": status,
                "weight": weight,
            })

    # 5. Reading History
    seen_history: Set[Any] = set()
    for item in reading_history or []:
        book = _extract_book(item)
        book_id = _get_book_id(book)
        if book_id is not None:
            excluded_book_ids.add(book_id)
            if book_id in seen_history:
                continue
            seen_history.add(book_id)

        text = create_book_text(book)
        if text:
            profile_documents.append(text)
            profile_weights.append(READING_WEIGHT)
            signal_metadata.append({
                "type": "reading_history",
                "book_id": book_id,
                "title": _get_val(book, "title", ""),
                "weight": READING_WEIGHT,
            })

    # 6. Search History
    for s in search_history or []:
        query = _get_val(s, "query")
        if not query and isinstance(s, str):
            query = s
        if not query:
            continue
        query_str = str(query).strip()
        if not query_str:
            continue

        profile_documents.append(query_str)
        profile_weights.append(SEARCH_WEIGHT)
        signal_metadata.append({
            "type": "search",
            "query": query_str,
            "weight": SEARCH_WEIGHT,
        })

    return {
        "documents": profile_documents,
        "weights": profile_weights,
        "excluded_book_ids": excluded_book_ids,
        "signals": signal_metadata,
        "seed_books": seed_books,
    }


# ============================================================
# PERSONALIZED RECOMMENDATIONS ENTRY POINT
# ============================================================

def personalized_recommendations(
    arg1: Any = None,
    user_or_interests: Optional[Any] = None,
    *,
    user: Optional[Any] = None,
    db: Optional[Any] = None,
    recommender: Optional[BookRecommender] = None,
    interests: Optional[List[Any]] = None,
    favorites: Optional[List[Any]] = None,
    ratings: Optional[List[Any]] = None,
    library: Optional[List[Any]] = None,
    reading_history: Optional[List[Any]] = None,
    search_history: Optional[List[Any]] = None,
    limit: int = 10,
    as_dict: Optional[bool] = None,
) -> Any:
    """Generate personalized recommendations for a user.

    Can be invoked in two modes:
    1. Direct DB Session + User (e.g. `personalized_recommendations(db, user, limit=10)`)
    2. Recommender instance + explicit signals / user (e.g. from FastAPI routes)
    """
    from . import get_recommender

    # Detect DB session and User from arguments
    db_session = db
    target_user = user

    if hasattr(arg1, "execute") and hasattr(arg1, "query"):
        # arg1 is a SQLAlchemy Session
        db_session = arg1
        if user_or_interests is not None and target_user is None:
            target_user = user_or_interests
    elif isinstance(arg1, BookRecommender):
        recommender = arg1
        if user_or_interests is not None and target_user is None:
            target_user = user_or_interests

    # Determine default return format:
    # If caller explicitly passed as_dict, honour it.
    # Otherwise: if called as (Session, user, ...) in test harness, return list.
    # If called from FastAPI or with as_dict=True, return dict.
    if as_dict is None:
        if db_session is not None and target_user is not None and not isinstance(arg1, BookRecommender):
            as_dict = False
        else:
            as_dict = True

    # If DB session and User are present, load signals from database
    if db_session is not None and target_user is not None and hasattr(target_user, "id"):
        from ..database.models import (
            Favorite,
            LibraryEntry,
            Rating,
            ReadingHistory,
            SearchHistory,
            UserInterest,
        )

        user_id = target_user.id

        if interests is None:
            interests = (
                db_session.query(UserInterest)
                .filter(UserInterest.user_id == user_id)
                .all()
            )

        if favorites is None:
            favorites = (
                db_session.query(Favorite)
                .filter(Favorite.user_id == user_id)
                .all()
            )

        if ratings is None:
            ratings = (
                db_session.query(Rating)
                .filter(Rating.user_id == user_id)
                .all()
            )

        if library is None:
            library = (
                db_session.query(LibraryEntry)
                .filter(LibraryEntry.user_id == user_id)
                .all()
            )

        if reading_history is None:
            reading_history = (
                db_session.query(ReadingHistory)
                .filter(ReadingHistory.user_id == user_id)
                .order_by(ReadingHistory.created_at.desc())
                .limit(50)
                .all()
            )

        if search_history is None:
            search_history = (
                db_session.query(SearchHistory)
                .filter(SearchHistory.user_id == user_id)
                .order_by(SearchHistory.created_at.desc())
                .limit(50)
                .all()
            )

    # Get recommender engine
    if recommender is None:
        recommender = get_recommender(db_session)
    elif not recommender.is_trained and db_session is not None:
        recommender = get_recommender(db_session)

    if not recommender.is_trained:
        if as_dict:
            return {
                "items": [],
                "because": [],
                "authors": [],
                "has_signals": False,
                "algorithm": "tfidf-cosine",
                "message": "Recommendation model is not trained.",
            }
        return []

    if limit <= 0:
        if as_dict:
            return {
                "items": [],
                "because": [],
                "authors": [],
                "has_signals": False,
                "algorithm": "tfidf-cosine",
            }
        return []

    # Build profile
    profile = build_user_profile(
        interests=interests,
        favorites=favorites,
        ratings=ratings,
        library=library,
        reading_history=reading_history,
        search_history=search_history,
    )

    documents = profile["documents"]
    weights = profile["weights"]
    excluded_book_ids = profile["excluded_book_ids"]
    signals = profile["signals"]
    seed_books = profile["seed_books"]

    has_signals = bool(signals)

    # Cold start: No user signals
    if not documents:
        if as_dict:
            return {
                "items": [],
                "because": [],
                "authors": [],
                "has_signals": False,
                "algorithm": "tfidf-cosine",
            }
        return []

    profile_vector = recommender.create_profile_vector(
        profile_documents=documents,
        weights=weights,
    )

    if profile_vector is None:
        if as_dict:
            return {
                "items": [],
                "because": [],
                "authors": [],
                "has_signals": True,
                "algorithm": "tfidf-cosine",
            }
        return []

    # Top recommendations
    recommendations = recommender.recommend_for_vector(
        user_vector=profile_vector,
        top_n=limit,
        exclude_ids=excluded_book_ids,
    )

    # Add explanatory reasons to each recommendation
    recommendations = _add_recommendation_reasons(recommendations, signals)

    # If the caller only wanted the list (e.g. tests)
    if not as_dict:
        return recommendations

    # Generate "Because You Like" sections from top seed books
    because_groups = _build_because_groups(
        seed_books=seed_books,
        recommender=recommender,
        exclude_ids=excluded_book_ids,
        max_groups=2,
    )

    # Extract unique authors for UI
    authors = _extract_authors(recommendations)

    return {
        "items": recommendations,
        "because": because_groups,
        "authors": authors,
        "has_signals": True,
        "algorithm": "tfidf-cosine",
        "signal_count": len(signals),
    }


# ============================================================
# EXPLANATIONS & REASONS
# ============================================================

def _add_recommendation_reasons(
    recommendations: List[Dict[str, Any]],
    signals: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Assign an intuitive explanation reason to each recommended book."""
    if not recommendations:
        return recommendations

    interest_vals = [s["value"] for s in signals if s["type"] == "interest"]
    search_queries = [s["query"] for s in signals if s["type"] == "search"]
    fav_titles = [s["title"] for s in signals if s["type"] == "favorite" and s.get("title")]

    for rec in recommendations:
        rec_title = (rec.get("title") or "").lower()
        rec_cat = (rec.get("category") or "").lower()
        rec_desc = (rec.get("description") or "").lower()

        reason = None

        # Check interest match
        for interest in interest_vals:
            if interest.lower() in rec_cat or interest.lower() in rec_title or interest.lower() in rec_desc:
                reason = f"Matches your interest in {interest}"
                break

        # Check search match
        if not reason:
            for q in search_queries:
                if q.lower() in rec_title or q.lower() in rec_desc or q.lower() in rec_cat:
                    reason = f'Based on your search "{q}"'
                    break

        # Check favorite match
        if not reason and fav_titles:
            reason = f'Because you liked "{fav_titles[0]}"'

        # Fallback to general signal reason
        if not reason:
            if interest_vals:
                reason = f"Matches your interest in {interest_vals[0]}"
            elif search_queries:
                reason = f'Based on your search "{search_queries[0]}"'
            elif fav_titles:
                reason = "Because of books you added to favorites"
            else:
                reason = "Recommended based on your reading preferences"

        rec["reason"] = reason

    return recommendations


# ============================================================
# "BECAUSE YOU LIKE" GROUPS
# ============================================================

def _build_because_groups(
    seed_books: List[Any],
    recommender: BookRecommender,
    exclude_ids: Set[Any],
    max_groups: int = 2,
) -> List[Dict[str, Any]]:
    """Build 'Because You Like [Book Title]' recommendation carousels."""
    groups = []
    seen_seeds: Set[Any] = set()

    for seed in seed_books:
        seed_id = _get_book_id(seed)
        if seed_id is None or seed_id in seen_seeds:
            continue
        seen_seeds.add(seed_id)

        similar_items = recommender.recommend(
            book_id=seed_id,
            top_n=6,
            exclude_ids=exclude_ids,
        )

        if not similar_items:
            continue

        seed_data = {
            "id": seed_id,
            "title": _get_val(seed, "title", "Untitled"),
            "author": _get_val(seed, "author", "Unknown author"),
            "category": _get_val(seed, "category", ""),
            "cover_id": _get_val(seed, "cover_id", None),
            "ol_key": _get_val(seed, "ol_key", None),
        }

        groups.append({
            "seed": seed_data,
            "items": similar_items,
        })

        if len(groups) >= max_groups:
            break

    return groups


# ============================================================
# AUTHOR EXTRACTION
# ============================================================

def _extract_authors(recommendations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Extract unique authors from recommendations for the frontend AuthorsSection."""
    authors: Dict[str, Dict[str, Any]] = {}

    for book in recommendations:
        author_val = book.get("author")
        if not author_val:
            continue

        names = [n.strip() for n in str(author_val).split(",") if n.strip()]
        for name in names:
            if name not in authors:
                authors[name] = {
                    "id": name.lower().replace(" ", "_"),
                    "name": name,
                    "photo_url": None,
                }

    return list(authors.values())[:12]