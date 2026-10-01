"""Books and Reader API Endpoints."""

from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..auth.firebase import get_current_user
from ..database.connection import get_db
from ..database.models import Book, ReadingHistory, User
from ..services import openlibrary as ol
from ..services.book_sources import gutenberg_get_pdf_url, openlibrary_get_pdf_url
from ..services.catalog_service import availability, resolve_book
from ..services.reader_service import (
    get_user_reading_state,
    is_url_allowed,
    record_book_opened,
    resolve_reader_source,
    sanitize_html,
    update_reading_progress,
)

router = APIRouter(
    prefix="/books",
    tags=["Books"],
)


class ProgressUpdate(BaseModel):
    progress: int = Field(ge=0, le=100)
    current_page: Optional[int] = None
    total_pages: Optional[int] = None


@router.get("/")
def get_books(db: Session = Depends(get_db)):
    """Return all books from the catalog."""
    return db.query(Book).all()


@router.get("/{book_id}")
def get_book(
    book_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve book by internal ID or Open Library key."""
    return resolve_book(db, str(book_id))


# ---------------------------------------------------------------------------
# In-App Book Reader Endpoints
# ---------------------------------------------------------------------------

@router.get("/{book_id}/reader")
def get_book_reader(
    book_id: str,
    user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Resolve in-app reader information, permissions, and user reading progress."""
    book = resolve_book(db, str(book_id))
    source_info = resolve_reader_source(db, book)

    reading_state = {
        "progress": 0,
        "status": "want_to_read",
        "current_page": 1,
        "total_pages": getattr(book, "pages", 100) or 100,
        "last_read_at": None,
    }

    if user is not None:
        record_book_opened(db, user, book)
        reading_state = get_user_reading_state(db, user, book)

    cover_url = ol.cover_url(book.cover_id) if getattr(book, "cover_id", None) else None

    return {
        "book_id": str(book.id),
        "ol_key": book.ol_key,
        "title": book.title,
        "author": book.author or "Unknown author",
        "category": book.category,
        "cover_url": cover_url,
        "available": source_info["available"],
        "access_type": source_info["access_type"],
        "reader_type": source_info["reader_type"],
        "reader_url": source_info["reader_url"],
        "pdf_url": source_info.get("pdf_url"),
        "source": source_info["source"],
        "embeddable": source_info["embeddable"],
        "message": source_info["message"],
        "progress": reading_state["progress"],
        "status": reading_state["status"],
        "current_page": reading_state["current_page"],
        "total_pages": reading_state["total_pages"],
        "last_read_at": reading_state["last_read_at"],
    }


@router.post("/{book_id}/reader/progress")
def save_reader_progress(
    book_id: str,
    payload: ProgressUpdate,
    user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update user reading progress for the specified book."""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required to save progress")

    book = resolve_book(db, str(book_id))
    return update_reading_progress(
        db=db,
        user=user,
        book=book,
        progress=payload.progress,
        current_page=payload.current_page,
        total_pages=payload.total_pages,
    )


@router.get("/{book_id}/reader/content")
def get_reader_content(
    book_id: str,
    user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deliver sanitized public-domain HTML content for in-app reading."""
    book = resolve_book(db, str(book_id))
    source_info = resolve_reader_source(db, book)

    if not source_info["available"] or source_info["reader_type"] not in ("html", "text"):
        raise HTTPException(status_code=404, detail="Direct HTML content is not available for this book")

    url = source_info["reader_url"]
    if not is_url_allowed(url):
        raise HTTPException(status_code=403, detail="Reader source domain not allowed")

    try:
        resp = httpx.get(url, timeout=8.0, follow_redirects=True)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch reader content from provider")
        clean_content = sanitize_html(resp.text)
        return {
            "title": book.title,
            "author": book.author,
            "content": clean_content,
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Error loading book content: {exc}")


# ---------------------------------------------------------------------------
# Legacy PDF reading endpoint (kept for backward compatibility)
# ---------------------------------------------------------------------------
@router.get("/{book_id}/read")
def get_read_url(
    book_id: str,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return reader location for client navigation."""
    book = resolve_book(db, str(book_id))

    pdf_url: Optional[str] = None
    source_adapter: Optional[str] = None
    for adapter, name in [
        (openlibrary_get_pdf_url, "openlibrary"),
        (gutenberg_get_pdf_url, "gutenberg"),
    ]:
        try:
            candidate = adapter(book)
        except Exception:
            candidate = None
        if candidate:
            pdf_url = candidate
            source_adapter = name
            break

    if pdf_url and source_adapter:
        mode = "pdf"
        reader_url = pdf_url
    else:
        links = availability(book)
        if links.get("read_url"):
            mode = "external"
            source_adapter = "openlibrary"
            reader_url = links["read_url"]
        elif links.get("borrow_url"):
            mode = "external"
            source_adapter = "openlibrary"
            reader_url = links["borrow_url"]
        else:
            mode = "unavailable"
            source_adapter = None
            reader_url = None

    if user:
        try:
            record_book_opened(db, user, book)
        except Exception:
            pass

    if mode in ("pdf", "external"):
        return {
            "mode": mode,
            "book_id": str(book.id),
            "reader_url": reader_url,
            "pdf_url": pdf_url,
            "source": source_adapter,
        }
    else:
        return {
            "mode": mode,
            "book_id": str(book.id),
            "message": "No online readable copy is available.",
        }
