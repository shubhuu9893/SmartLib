"""Text preprocessing utilities for the SmartLib TF-IDF recommendation system."""

import re
from typing import Any, List, Optional


def _get_value(item: Any, field: str, default: Any = "") -> Any:
    """Get a field from either a dictionary or an object/model."""
    if item is None:
        return default

    if isinstance(item, dict):
        value = item.get(field, default)
    else:
        value = getattr(item, field, default)

    if value is None:
        return default

    return value


def _clean_text(value: Any) -> str:
    """Clean and normalize text before TF-IDF vectorization."""
    if not value:
        return ""

    if isinstance(value, (list, tuple, set)):
        parts = []
        for elem in value:
            if isinstance(elem, dict):
                val = elem.get("name") or elem.get("title") or elem.get("interest") or ""
                if val:
                    parts.append(str(val))
            elif elem is not None:
                parts.append(str(elem))
        value = " ".join(parts)
    else:
        value = str(value)

    # Replace punctuation that glues words together with space (e.g. "ai,innovation" -> "ai innovation")
    value = re.sub(r"[,;:/|_\-]+", " ", value)
    # Normalize whitespace
    value = " ".join(value.split())
    return value.strip()


def create_book_text(book: Any) -> str:
    """Combine book metadata into a rich text document for TF-IDF processing.

    Fields used:
    - title (boosted)
    - author (boosted)
    - category (boosted)
    - keywords & subjects (boosted)
    - description
    - genres
    """
    title = _clean_text(_get_value(book, "title"))
    author = _clean_text(_get_value(book, "author"))
    category = _clean_text(_get_value(book, "category"))
    description = _clean_text(_get_value(book, "description"))
    keywords = _clean_text(_get_value(book, "keywords"))
    subjects = _clean_text(_get_value(book, "subjects"))
    genres = _clean_text(_get_value(book, "genres"))

    # Boost title, category, keywords, author to ensure key topics match well
    text_parts = [
        title,
        title,
        author,
        category,
        category,
        keywords,
        subjects,
        genres,
        description,
    ]

    return " ".join(part for part in text_parts if part).strip()


def extract_item_text(item: Any, signal_type: str = "general") -> str:
    """Extract informative text representation from a single signal item.

    Supports strings, dicts, and SQLAlchemy models for interests, favorites,
    ratings, library entries, reading history, and search queries.
    """
    if item is None:
        return ""

    if isinstance(item, str):
        return _clean_text(item)

    # For interest models or dicts:
    if signal_type == "interest":
        val = _get_value(item, "interest") or _get_value(item, "name") or _get_value(item, "value")
        if val:
            return _clean_text(val)

    # For search history:
    if signal_type == "search":
        val = _get_value(item, "query")
        if val:
            return _clean_text(val)

    # If it is a book relationship or contains a book:
    book = _get_value(item, "book")
    if book is not None:
        return create_book_text(book)

    # If item itself is a book or has book fields:
    title = _get_value(item, "title", None)
    if title:
        return create_book_text(item)

    # If item has query:
    query = _get_value(item, "query", None)
    if query:
        return _clean_text(query)

    # If item has interest:
    interest = _get_value(item, "interest", None)
    if interest:
        return _clean_text(interest)

    if isinstance(item, dict):
        return _clean_text(" ".join(str(v) for v in item.values() if v is not None))

    return _clean_text(str(item))


def create_profile_text(
    interests: Optional[List[Any]] = None,
    favorites: Optional[List[Any]] = None,
    ratings: Optional[List[Any]] = None,
    library: Optional[List[Any]] = None,
    reading_history: Optional[List[Any]] = None,
    search_history: Optional[List[Any]] = None,
) -> str:
    """Create a single text document representing a user's combined profile."""
    parts = []

    for item in interests or []:
        text = extract_item_text(item, "interest")
        if text:
            parts.append(text)

    for item in favorites or []:
        text = extract_item_text(item, "favorite")
        if text:
            parts.append(text)

    for item in ratings or []:
        text = extract_item_text(item, "rating")
        if text:
            parts.append(text)

    for item in library or []:
        text = extract_item_text(item, "library")
        if text:
            parts.append(text)

    for item in reading_history or []:
        text = extract_item_text(item, "reading_history")
        if text:
            parts.append(text)

    for item in search_history or []:
        text = extract_item_text(item, "search")
        if text:
            parts.append(text)

    return " ".join(parts).strip()