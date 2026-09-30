from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..auth.firebase import get_optional_user
from ..database.connection import get_db
from ..database.models import Book, Favorite, LibraryEntry, Rating, SearchHistory, User
from ..recommendation.recommender import BookRecommender
from ..services import openlibrary as ol
from ..services.catalog_service import (
    availability,
    resolve_book,
    serialize_book,
    serialize_doc,
    upsert_docs,
)
from ..services.categories import CATEGORIES, find_category

router = APIRouter(prefix="/catalog", tags=["Catalog"])

SearchField = Literal["all", "title", "author", "subject", "isbn"]


def _paged(items: list[dict], total: int, page: int, limit: int) -> dict:
    return {"items": items, "total": total, "page": page, "limit": limit, "has_more": page * limit < total}


def _upstream(call, *args, **kwargs):
    try:
        return call(*args, **kwargs)
    except ol.OpenLibraryError as exc:
        raise HTTPException(status_code=502, detail="The book catalog is temporarily unavailable") from exc


@router.get("/categories")
def list_categories():
    return {"items": [{"id": c["id"], "name": c["name"], "subject": c["subject"]} for c in CATEGORIES]}


@router.get("/search")
def search_books(
    q: str = Query(min_length=1, max_length=200),
    field: SearchField = "all",
    page: int = Query(default=1, ge=1, le=100),
    limit: int = Query(default=20, ge=1, le=50),
    sort: Literal["relevance", "new", "old", "rating"] = "relevance",
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    query = q.strip()
    result = _upstream(ol.search, query, field, page, limit, None if sort == "relevance" else sort)
    if sort == "rating":
        result["items"].sort(key=lambda d: d.get("ratings_average") or 0, reverse=True)

    if user is not None and page == 1:
        last = (
            db.query(SearchHistory)
            .filter(SearchHistory.user_id == user.id)
            .order_by(SearchHistory.created_at.desc())
            .first()
        )
        if not last or last.query.lower() != query.lower():
            db.add(SearchHistory(user_id=user.id, query=query[:255]))
            db.commit()

    return _paged([serialize_doc(d) for d in result["items"]], result["total"], page, limit)


@router.get("/trending")
def trending(
    period: Literal["daily", "weekly", "monthly", "yearly", "forever"] = "daily",
    page: int = Query(default=1, ge=1, le=20),
    limit: int = Query(default=20, ge=1, le=50),
):
    items = _upstream(ol.trending, period, page, limit)
    return {"items": [serialize_doc(d) for d in items], "page": page, "limit": limit, "has_more": len(items) == limit}


@router.get("/popular")
def popular(page: int = Query(default=1, ge=1, le=20), limit: int = Query(default=20, ge=1, le=50)):
    result = _upstream(ol.raw_query, "ratings_count:[100 TO *]", page, limit, "readinglog", 3600)
    return _paged([serialize_doc(d) for d in result["items"]], result["total"], page, limit)


@router.get("/new")
def new_books(page: int = Query(default=1, ge=1, le=20), limit: int = Query(default=20, ge=1, le=50)):
    year = datetime.utcnow().year
    result = _upstream(
        ol.raw_query, f"first_publish_year:[{year - 1} TO {year}] AND ratings_count:[3 TO *]", page, limit, "rating"
    )
    return _paged([serialize_doc(d) for d in result["items"]], result["total"], page, limit)


@router.get("/recent")
def recently_added(limit: int = Query(default=20, ge=1, le=50), db: Session = Depends(get_db)):
    rows = db.query(Book).order_by(Book.created_at.desc(), Book.id.desc()).limit(limit).all()
    return {"items": [serialize_book(b) for b in rows]}


@router.get("/subjects/{category_id}")
def subject_books(
    category_id: str,
    page: int = Query(default=1, ge=1, le=100),
    limit: int = Query(default=20, ge=1, le=50),
):
    category = find_category(category_id)
    slug = category["subject"] if category else category_id.strip().lower().replace(" ", "_").replace("-", "_")
    result = _upstream(ol.subject, slug, page, limit)
    return {
        "category": {"id": category["id"] if category else category_id, "name": category["name"] if category else result["name"].title()},
        **_paged([serialize_doc(d) for d in result["items"]], result["total"], page, limit),
    }


@router.get("/books/{book_ref}")
def book_detail(
    book_ref: str,
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    book = resolve_book(db, book_ref)
    data = serialize_book(book)
    data["availability"] = availability(book)
    data["user_state"] = None
    if user is not None:
        favorite = db.query(Favorite.id).filter(Favorite.user_id == user.id, Favorite.book_id == book.id).first()
        rating = db.query(Rating).filter(Rating.user_id == user.id, Rating.book_id == book.id).first()
        entry = db.query(LibraryEntry).filter(LibraryEntry.user_id == user.id, LibraryEntry.book_id == book.id).first()
        data["user_state"] = {
            "is_favorite": favorite is not None,
            "rating": rating.rating if rating else None,
            "library_status": entry.status if entry else None,
            "progress": entry.progress if entry else None,
        }
    return data


@router.get("/books/{book_ref}/similar")
def similar_books(book_ref: str, limit: int = Query(default=12, ge=1, le=30), db: Session = Depends(get_db)):
    book = resolve_book(db, book_ref)
    subjects = [s.strip() for s in (book.keywords or "").split(",") if s.strip()][:3]
    for subject in subjects:
        try:
            upsert_docs(db, ol.subject(subject.lower().replace(" ", "_"), 1, 20)["items"])
        except ol.OpenLibraryError:
            continue

    books = db.query(Book).all()
    recommender = BookRecommender()
    if len(books) < 2:
        return {"items": [], "algorithm": "tfidf-cosine"}
    recommender.train(books)
    by_id = {b.id: b for b in books}
    results = []
    for rec in recommender.recommend(book.id, limit):
        if rec["similarity"] <= 0:
            continue
        data = serialize_book(by_id[rec["id"]])
        data["score"] = rec["similarity"]
        results.append(data)
    return {"items": results, "algorithm": "tfidf-cosine"}


@router.get("/authors")
def search_authors(
    q: str = Query(min_length=1, max_length=200),
    page: int = Query(default=1, ge=1, le=50),
    limit: int = Query(default=20, ge=1, le=50),
):
    result = _upstream(ol.search_authors, q.strip(), page, limit)
    return _paged(result["items"], result["total"], page, limit)


@router.get("/authors/{author_id}")
def author_detail(author_id: str, page: int = Query(default=1, ge=1, le=50), limit: int = Query(default=24, ge=1, le=50)):
    if not ol.AUTHOR_ID_RE.match(author_id):
        raise HTTPException(status_code=400, detail="Invalid author id")
    data = _upstream(ol.author, author_id)
    if not data or data.get("type", {}).get("key") == "/type/redirect":
        if data and data.get("location"):
            return author_detail(ol.strip_key(data["location"]), page, limit)
        raise HTTPException(status_code=404, detail="Author not found")
    works = _upstream(ol.author_works, author_id, page, limit)
    photos = [p for p in data.get("photos") or [] if p and p > 0]
    links = [{"title": link.get("title"), "url": link.get("url")} for link in data.get("links") or [] if link.get("url")]
    subject_counts: dict[str, int] = {}
    for item in works["items"]:
        for subject in item.get("subjects") or []:
            subject_counts[subject] = subject_counts.get(subject, 0) + 1
    top_subjects = sorted(subject_counts, key=subject_counts.get, reverse=True)[:8]
    return {
        "id": author_id,
        "name": data.get("name") or data.get("personal_name"),
        "bio": ol.text_value(data.get("bio")),
        "birth_date": data.get("birth_date"),
        "death_date": data.get("death_date"),
        "photo_url": ol.author_photo_url(author_id) if photos else None,
        "alternate_names": (data.get("alternate_names") or [])[:5],
        "links": links,
        "wikipedia": data.get("wikipedia"),
        "top_subjects": top_subjects,
        "works": _paged([serialize_doc(d) for d in works["items"]], works["total"], page, limit),
    }
