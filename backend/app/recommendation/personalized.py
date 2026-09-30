"""Personalized recommendations: TF-IDF over the book catalog + cosine similarity
between each candidate book and a weighted profile built from the user's signals."""

import math
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from scipy.sparse import vstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session

from ..database.models import (
    Book,
    Favorite,
    LibraryEntry,
    Rating,
    ReadingHistory,
    SearchHistory,
    User,
    UserInterest,
)
from ..services import openlibrary as ol
from ..services.catalog_service import serialize_book, upsert_docs
from ..services.categories import find_category
from .preprocessing import create_book_text

RATING_WEIGHTS = {5: 3.0, 4: 2.0, 3: 0.5, 2: -1.0, 1: -2.0}
LIBRARY_WEIGHTS = {"reading": 2.0, "completed": 2.0, "want_to_read": 1.5}
POOL_LIMIT = 3000

_pool = ThreadPoolExecutor(max_workers=6)


def _subject_slug(subject: str) -> str:
    return subject.strip().lower().replace(" ", "_")


def _collect_signals(db: Session, user: User):
    interests = [i.interest for i in db.query(UserInterest).filter(UserInterest.user_id == user.id).all()]
    favorites = db.query(Favorite).filter(Favorite.user_id == user.id).order_by(Favorite.created_at.desc()).all()
    ratings = db.query(Rating).filter(Rating.user_id == user.id).order_by(Rating.updated_at.desc()).all()
    library = db.query(LibraryEntry).filter(LibraryEntry.user_id == user.id).all()
    history = (
        db.query(ReadingHistory)
        .filter(ReadingHistory.user_id == user.id)
        .order_by(ReadingHistory.created_at.desc())
        .limit(30)
        .all()
    )
    searches = (
        db.query(SearchHistory)
        .filter(SearchHistory.user_id == user.id)
        .order_by(SearchHistory.created_at.desc())
        .limit(10)
        .all()
    )

    book_weights: dict[int, float] = {}
    book_labels: dict[int, str] = {}
    books: dict[int, Book] = {}

    def add(book: Book, weight: float, label: str):
        books[book.id] = book
        book_weights[book.id] = book_weights.get(book.id, 0.0) + weight
        book_labels.setdefault(book.id, label)

    for fav in favorites:
        add(fav.book, 3.0, "favorite")
    for rating in ratings:
        add(rating.book, RATING_WEIGHTS.get(rating.rating, 0.0), "rated")
    for entry in library:
        add(entry.book, LIBRARY_WEIGHTS.get(entry.status, 1.0), "library")
    seen_history = set()
    for item in history:
        if item.book_id in seen_history:
            continue
        seen_history.add(item.book_id)
        add(item.book, 1.0, "viewed")

    text_signals = []
    for interest in interests:
        category = find_category(interest)
        terms = " ".join([interest] + (category["match"] if category else []))
        text_signals.append((terms, 2.0, f"interest:{interest}"))
    for search in searches:
        text_signals.append((search.query, 1.0, f"search:{search.query}"))

    excluded = {f.book_id for f in favorites} | {r.book_id for r in ratings} | {e.book_id for e in library}
    return {
        "interests": interests,
        "favorites": favorites,
        "ratings": ratings,
        "searches": searches,
        "books": books,
        "book_weights": book_weights,
        "book_labels": book_labels,
        "text_signals": text_signals,
        "excluded": excluded,
    }


def _expand_candidates(db: Session, signals: dict):
    subjects: list[str] = []
    for interest in signals["interests"]:
        category = find_category(interest)
        subjects.append(category["subject"] if category else _subject_slug(interest))

    liked = [b for bid, b in signals["books"].items() if signals["book_weights"][bid] >= 2.0]
    subject_counts = Counter()
    for book in liked:
        for subject in (book.keywords or "").split(",")[:8]:
            if subject.strip():
                subject_counts[_subject_slug(subject)] += 1
    subjects += [s for s, _ in subject_counts.most_common(4)]
    subjects = list(dict.fromkeys(subjects))[:10]

    queries = list(dict.fromkeys(s.query for s in signals["searches"]))[:3]

    futures = [_pool.submit(ol.subject, slug, 1, 20) for slug in subjects]
    futures += [_pool.submit(ol.search, q, "all", 1, 10) for q in queries]
    docs = []
    for future in futures:
        try:
            docs.extend(future.result()["items"])
        except ol.OpenLibraryError:
            continue
    if docs:
        upsert_docs(db, docs)


def _reason(label: str, signal_book: Book | None) -> str:
    if label.startswith("interest:"):
        return f"Matches your interest in {label.split(':', 1)[1]}"
    if label.startswith("search:"):
        return f"Based on your search \u201c{label.split(':', 1)[1]}\u201d"
    if signal_book is not None:
        verb = {"favorite": "you liked", "rated": "you rated", "library": "is in your library", "viewed": "you viewed"}
        if label == "library":
            return f"Because {signal_book.title} {verb[label]}"
        return f"Because {verb.get(label, 'you liked')} {signal_book.title}"
    return "Recommended for you"


def personalized_recommendations(db: Session, user: User, limit: int = 24) -> dict:
    signals = _collect_signals(db, user)
    has_signals = bool(signals["books"] or signals["text_signals"])
    empty = {"items": [], "because": [], "authors": [], "has_signals": has_signals, "algorithm": "tfidf-cosine"}
    if not has_signals:
        return empty

    _expand_candidates(db, signals)

    pool = db.query(Book).order_by(Book.id.desc()).limit(POOL_LIMIT).all()
    pool_ids = {b.id for b in pool}
    for book in signals["books"].values():
        if book.id not in pool_ids:
            pool.append(book)
    if len(pool) < 2:
        return empty

    index_of = {b.id: i for i, b in enumerate(pool)}
    documents = [create_book_text(b) for b in pool]
    vectorizer = TfidfVectorizer(stop_words="english", max_features=50000)
    try:
        matrix = vectorizer.fit_transform(documents)
    except ValueError:
        return empty

    signal_rows = []
    signal_meta = []
    for book_id, weight in signals["book_weights"].items():
        if weight == 0:
            continue
        signal_rows.append(matrix[index_of[book_id]])
        signal_meta.append((weight, signals["book_labels"][book_id], signals["books"][book_id]))
    if signals["text_signals"]:
        text_matrix = vectorizer.transform([t for t, _, _ in signals["text_signals"]])
        for i, (_, weight, label) in enumerate(signals["text_signals"]):
            signal_rows.append(text_matrix[i])
            signal_meta.append((weight, label, None))
    if not signal_rows:
        return empty

    signal_matrix = vstack(signal_rows)
    weights = np.array([m[0] for m in signal_meta])
    per_signal = cosine_similarity(signal_matrix, matrix)
    scores = weights @ per_signal / max(np.abs(weights).sum(), 1e-9)

    excluded = signals["excluded"]
    positive = np.where(weights > 0)[0]
    ranked = []
    for i in np.argsort(scores)[::-1]:
        book = pool[i]
        if book.id in excluded or scores[i] <= 0:
            continue
        popularity = math.log1p(book.ratings_count or 0) * 0.002
        best = positive[np.argmax(per_signal[positive, i])] if len(positive) else None
        reason = _reason(signal_meta[best][1], signal_meta[best][2]) if best is not None else "Recommended for you"
        ranked.append((float(scores[i]) + popularity, book, reason))
        if len(ranked) >= limit * 2:
            break
    ranked.sort(key=lambda r: r[0], reverse=True)

    items = []
    for score, book, reason in ranked[:limit]:
        data = serialize_book(book)
        data["score"] = round(score, 4)
        data["reason"] = reason
        items.append(data)

    because = []
    seeds = [f.book for f in signals["favorites"][:2]]
    seeds += [r.book for r in signals["ratings"] if r.rating >= 4 and r.book not in seeds][: max(0, 2 - len(seeds))]
    for seed in seeds:
        sims = cosine_similarity(matrix[index_of[seed.id]], matrix).flatten()
        similar = []
        for j in np.argsort(sims)[::-1]:
            candidate = pool[j]
            if candidate.id == seed.id or candidate.id in excluded or sims[j] <= 0:
                continue
            data = serialize_book(candidate)
            data["score"] = round(float(sims[j]), 4)
            similar.append(data)
            if len(similar) >= 12:
                break
        if similar:
            because.append({"seed": serialize_book(seed), "items": similar})

    author_counts: Counter = Counter()
    author_names: dict[str, str] = {}
    for item in items:
        for author in item["authors"]:
            if author.get("id"):
                author_counts[author["id"]] += 1
                author_names[author["id"]] = author["name"]
    for fav in signals["favorites"]:
        for author in serialize_book(fav.book)["authors"]:
            if author.get("id"):
                author_counts[author["id"]] += 2
                author_names[author["id"]] = author["name"]
    authors = [
        {"id": aid, "name": author_names[aid], "photo_url": ol.author_photo_url(aid), "score": count}
        for aid, count in author_counts.most_common(12)
    ]

    return {"items": items, "because": because, "authors": authors, "has_signals": True, "algorithm": "tfidf-cosine"}
