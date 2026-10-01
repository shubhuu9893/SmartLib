"""SmartLib In-App Book Reader Service.

Handles legal source resolution, trusted URL validation,
reading progress tracking, and reader content delivery.
"""

from __future__ import annotations

import re
import urllib.parse
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..database.models import Book, LibraryEntry, ReadingHistory, User
from . import openlibrary as ol
from .catalog_service import resolve_book

# ============================================================
# TRUSTED DOMAIN ALLOWLIST
# ============================================================

ALLOWED_READER_HOSTS = {
    "archive.org",
    "www.archive.org",
    "openlibrary.org",
    "www.openlibrary.org",
    "gutenberg.org",
    "www.gutenberg.org",
    "gutendex.com",
    "standardebooks.org",
    "www.standardebooks.org",
    "books.google.com",
}


def is_url_allowed(url: Optional[str]) -> bool:
    """Validate that an external reader URL belongs to an approved legitimate provider."""
    if not url:
        return False

    url_str = str(url).strip()
    if url_str.startswith(("/", "#")):
        return True

    try:
        parsed = urllib.parse.urlparse(url_str)
    except Exception:
        return False

    if parsed.scheme not in ("http", "https"):
        return False

    host = (parsed.hostname or "").lower()
    return host in ALLOWED_READER_HOSTS or any(
        host.endswith("." + allowed) for allowed in ALLOWED_READER_HOSTS
    )


# ============================================================
# GUTENBERG DISCOVERY (PUBLIC DOMAIN)
# ============================================================

_GUTENDEX_URL = "https://gutendex.com/books"
_GUTENBERG_CACHE: Dict[str, Tuple[float, Optional[Dict[str, Any]]]] = {}


def find_gutenberg_source(book: Book) -> Optional[Dict[str, Any]]:
    """Look up legitimate public-domain editions from Project Gutenberg via Gutendex."""
    queries = []
    if getattr(book, "isbn", None):
        queries.append(f"search={urllib.parse.quote(str(book.isbn))}")
    if getattr(book, "title", None):
        title_q = re.sub(r"[^\w\s]", "", str(book.title)).strip()
        if title_q:
            queries.append(f"search={urllib.parse.quote(title_q)}")

    for q_param in queries[:2]:
        cache_key = q_param
        # Check cache (1 hr TTL)
        cached = _GUTENBERG_CACHE.get(cache_key)
        now = datetime.now(timezone.utc).timestamp()
        if cached and cached[0] > now:
            if cached[1]:
                return cached[1]
            continue

        url = f"{_GUTENDEX_URL}?{q_param}"
        try:
            resp = httpx.get(url, timeout=4.0)
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("results", [])
                for item in results:
                    formats = item.get("formats", {})
                    # Prefer HTML / Text / PDF
                    html_url = formats.get("text/html") or formats.get("text/html; charset=utf-8")
                    pdf_url = formats.get("application/pdf")
                    epub_url = formats.get("application/epub+zip")
                    text_url = formats.get("text/plain; charset=utf-8") or formats.get("text/plain")

                    selected_url = html_url or pdf_url or epub_url or text_url
                    if selected_url and is_url_allowed(selected_url):
                        reader_type = "html" if (html_url or text_url) else ("pdf" if pdf_url else "epub")
                        res = {
                            "reader_url": selected_url,
                            "reader_type": reader_type,
                            "source": "Project Gutenberg",
                            "access_type": "public_domain",
                            "gutenberg_id": item.get("id"),
                        }
                        _GUTENBERG_CACHE[cache_key] = (now + 3600, res)
                        return res
        except Exception:
            pass

        _GUTENBERG_CACHE[cache_key] = (now + 300, None)

    return None


# ============================================================
# SOURCE RESOLUTION
# ============================================================

def resolve_reader_source(db: Session, book: Book) -> Dict[str, Any]:
    """Resolve legitimate, copyright-compliant in-app reading sources for a book.

    Priority:
    1. Direct verified PDF if present on book record
    2. Open Library / Internet Archive BookReader embed (public domain or CDL borrowable)
    3. Project Gutenberg public-domain search
    4. Legitimate preview if available
    5. Clean unavailable / purchase-required state with explanation
    """
    title = getattr(book, "title", "Untitled")
    ia_id = getattr(book, "ia_id", None)
    ebook_access = getattr(book, "ebook_access", None)
    pdf_url = getattr(book, "pdf_url", None)
    ol_key = getattr(book, "ol_key", None)

    # 1. Direct PDF URL already associated with book
    if pdf_url and is_url_allowed(pdf_url):
        return {
            "available": True,
            "access_type": "public_domain" if ebook_access == "public" else "open_access",
            "reader_type": "pdf",
            "reader_url": pdf_url,
            "source": "SmartLib Catalog",
            "embeddable": True,
            "message": None,
        }

    # 2. Check Internet Archive / Open Library via ia_id
    if ia_id:
        clean_ia = str(ia_id).strip()
        embed_url = f"https://archive.org/embed/{clean_ia}"
        direct_pdf = f"https://archive.org/download/{clean_ia}/{clean_ia}.pdf"

        if ebook_access == "public":
            return {
                "available": True,
                "access_type": "public_domain",
                "reader_type": "iframe",
                "reader_url": embed_url,
                "pdf_url": direct_pdf,
                "source": "Open Library / Internet Archive",
                "embeddable": True,
                "message": "Public domain copy available for full in-app reading.",
            }
        elif ebook_access == "borrowable":
            return {
                "available": True,
                "access_type": "borrow",
                "reader_type": "iframe",
                "reader_url": embed_url,
                "source": "Open Library / Internet Archive",
                "embeddable": True,
                "message": "Digital lending copy: preview and borrow within the reader.",
            }
        elif ebook_access == "preview":
            return {
                "available": True,
                "access_type": "preview",
                "reader_type": "iframe",
                "reader_url": embed_url,
                "source": "Open Library / Internet Archive",
                "embeddable": True,
                "message": "Preview edition available for in-app reading.",
            }
        elif ebook_access == "printdisabled":
            return {
                "available": True,
                "access_type": "borrow",
                "reader_type": "iframe",
                "reader_url": embed_url,
                "source": "Internet Archive",
                "embeddable": True,
                "message": "Access available for print-disabled or Internet Archive patrons.",
            }

    # If ia_id is missing on the book record, query Open Library editions
    if ol_key and not ia_id:
        try:
            for ed in ol.editions(ol_key, limit=5):
                ed_ia = ed.get("ia") or ed.get("ocaid")
                if isinstance(ed_ia, list) and ed_ia:
                    ed_ia = ed_ia[0]
                if ed_ia:
                    ed_access = ed.get("ebook_access") or ("public" if ed.get("public_scan") else "borrowable")
                    # Update book model in DB
                    book.ia_id = str(ed_ia)
                    book.ebook_access = ed_access
                    try:
                        db.commit()
                        db.refresh(book)
                    except Exception:
                        db.rollback()

                    embed_url = f"https://archive.org/embed/{ed_ia}"
                    access_type = "public_domain" if ed_access == "public" else "borrow"
                    return {
                        "available": True,
                        "access_type": access_type,
                        "reader_type": "iframe",
                        "reader_url": embed_url,
                        "source": "Open Library / Internet Archive",
                        "embeddable": True,
                        "message": "Public domain copy available." if access_type == "public_domain" else "Digital lending copy available.",
                    }
        except Exception:
            pass

    # 3. Fallback: Project Gutenberg Public Domain search
    gutenberg = find_gutenberg_source(book)
    if gutenberg:
        return {
            "available": True,
            "access_type": gutenberg["access_type"],
            "reader_type": gutenberg["reader_type"],
            "reader_url": gutenberg["reader_url"],
            "source": gutenberg["source"],
            "embeddable": True,
            "message": "Legitimate public domain copy provided by Project Gutenberg.",
        }

    # 4. No legal readable source found -> Classify accurately
    first_year = getattr(book, "first_publish_year", None)
    publisher = getattr(book, "publisher", None)

    if first_year and first_year > 1928 and (publisher or ebook_access in ("unauthorized", "no_ebook")):
        return {
            "available": False,
            "access_type": "paid",
            "reader_type": None,
            "reader_url": None,
            "source": "Publisher / Commercial",
            "embeddable": False,
            "message": "This is a commercial copyrighted title. Online reading is restricted by the publisher.",
        }

    return {
        "available": False,
        "access_type": "unavailable",
        "reader_type": None,
        "reader_url": None,
        "source": "SmartLib Catalog",
        "embeddable": False,
        "message": "This book is not currently available for online reading.",
    }


# ============================================================
# READING PROGRESS & HISTORY
# ============================================================

def get_user_reading_state(db: Session, user: User, book: Book) -> Dict[str, Any]:
    """Retrieve the user's saved reading position and history for a book."""
    entry = (
        db.query(LibraryEntry)
        .filter(LibraryEntry.user_id == user.id, LibraryEntry.book_id == book.id)
        .first()
    )

    history = (
        db.query(ReadingHistory)
        .filter(ReadingHistory.user_id == user.id, ReadingHistory.book_id == book.id)
        .order_by(ReadingHistory.created_at.desc())
        .first()
    )

    progress = entry.progress if entry else 0
    status = entry.status if entry else "want_to_read"
    last_read = entry.updated_at if (entry and entry.updated_at) else (history.created_at if history else None)

    # Estimate current page if total pages known
    pages = getattr(book, "pages", None) or 100
    current_page = max(1, int(round((progress / 100.0) * pages))) if progress > 0 else 1

    return {
        "progress": progress,
        "status": status,
        "current_page": current_page,
        "total_pages": pages,
        "last_read_at": last_read.isoformat() if last_read else None,
    }


def record_book_opened(db: Session, user: User, book: Book) -> None:
    """Record an 'opened' reading history event avoiding immediate duplicates."""
    try:
        recent = (
            db.query(ReadingHistory)
            .filter(ReadingHistory.user_id == user.id, ReadingHistory.book_id == book.id)
            .order_by(ReadingHistory.created_at.desc())
            .first()
        )
        if not recent or recent.action != "opened":
            new_item = ReadingHistory(
                user_id=user.id,
                book_id=book.id,
                action="opened",
                created_at=datetime.now(timezone.utc),
            )
            db.add(new_item)
            db.commit()
    except Exception:
        db.rollback()


def update_reading_progress(
    db: Session,
    user: User,
    book: Book,
    progress: int,
    current_page: Optional[int] = None,
    total_pages: Optional[int] = None,
) -> Dict[str, Any]:
    """Upsert reading progress in LibraryEntry and append ReadingHistory."""
    progress = max(0, min(100, int(progress)))

    entry = (
        db.query(LibraryEntry)
        .filter(LibraryEntry.user_id == user.id, LibraryEntry.book_id == book.id)
        .first()
    )

    new_status = "completed" if progress >= 100 else "reading"

    if entry is None:
        entry = LibraryEntry(
            user_id=user.id,
            book_id=book.id,
            status=new_status,
            progress=progress,
        )
        db.add(entry)
    else:
        entry.progress = progress
        entry.status = new_status
        entry.updated_at = datetime.now(timezone.utc)

    # Record read action in history
    history = ReadingHistory(
        user_id=user.id,
        book_id=book.id,
        action="read",
        created_at=datetime.now(timezone.utc),
    )
    db.add(history)

    db.commit()
    db.refresh(entry)

    pages = total_pages or getattr(book, "pages", 100) or 100
    calc_page = current_page or max(1, int(round((progress / 100.0) * pages)))

    return {
        "ok": True,
        "progress": entry.progress,
        "status": entry.status,
        "current_page": calc_page,
        "total_pages": pages,
        "updated_at": entry.updated_at.isoformat() if entry.updated_at else datetime.now(timezone.utc).isoformat(),
    }


# ============================================================
# HTML CONTENT SANITIZER
# ============================================================

def sanitize_html(html_text: str) -> str:
    """Sanitize externally sourced public-domain HTML text to eliminate script/iframe tags."""
    if not html_text:
        return ""

    # Remove script and style tags
    clean = re.sub(r"(?is)<script.*?</script>", "", html_text)
    clean = re.sub(r"(?is)<style.*?</style>", "", clean)
    clean = re.sub(r"(?is)<iframe.*?</iframe>", "", clean)
    clean = re.sub(r"(?is)<object.*?</object>", "", clean)
    clean = re.sub(r"(?is)<embed.*?>", "", clean)
    # Remove inline on* event handlers
    clean = re.sub(r'(?i)\son\w+\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+)', "", clean)
    # Remove javascript: URIs
    clean = re.sub(r'(?i)href\s*=\s*["\']javascript:[^"\']*["\']', 'href="#"', clean)

    return clean
