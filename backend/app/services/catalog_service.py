import re
from concurrent.futures import ThreadPoolExecutor

from fastapi import HTTPException
from sqlalchemy.dialects import postgresql, sqlite
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.orm import Session

from ..database.models import Book
from . import openlibrary as ol
from .categories import category_for_subjects

_pool = ThreadPoolExecutor(max_workers=8)


def _is_unique_violation(exc: DBAPIError) -> bool:
    return isinstance(exc, IntegrityError) or "UNIQUE constraint failed" in str(exc.orig)


def is_work_ref(ref: str) -> bool:
    return bool(ol.WORK_ID_RE.match(ref or ""))


def _authors_from_row(book: Book) -> list[dict]:
    names = [n.strip() for n in (book.author or "").split(",") if n.strip()]
    keys = [k.strip() for k in (book.author_keys or "").split(",")]
    return [{"id": keys[i] if i < len(keys) and keys[i] else None, "name": n} for i, n in enumerate(names)]


def serialize_book(book: Book) -> dict:
    subjects = [s.strip() for s in (book.keywords or "").split(",") if s.strip()]
    return {
        "id": book.ol_key or str(book.id),
        "db_id": book.id,
        "title": book.title,
        "author": book.author,
        "authors": _authors_from_row(book),
        "cover_url": ol.cover_url(book.cover_id),
        "category": book.category,
        "subjects": subjects[:12],
        "description": book.description,
        "first_publish_year": book.first_publish_year,
        "rating": book.ratings_average,
        "rating_count": book.ratings_count,
        "isbn": book.isbn,
        "publisher": book.publisher,
        "language": book.language,
        "pages": book.pages,
        "ebook_access": book.ebook_access,
        "pdf_url": book.pdf_url,
        "source": "openlibrary" if book.ol_key else "local",
        "created_at": book.created_at.isoformat() if book.created_at else None,
    }


def serialize_doc(doc: dict) -> dict:
    authors = doc.get("authors") or []
    return {
        "id": doc["ol_key"],
        "db_id": None,
        "title": doc["title"],
        "author": ", ".join(a["name"] for a in authors) or None,
        "authors": authors,
        "cover_url": ol.cover_url(doc.get("cover_id")),
        "category": category_for_subjects(doc.get("subjects") or []),
        "subjects": (doc.get("subjects") or [])[:12],
        "description": doc.get("description"),
        "first_publish_year": doc.get("first_publish_year"),
        "rating": round(doc["ratings_average"], 2) if doc.get("ratings_average") else None,
        "rating_count": doc.get("ratings_count"),
        "isbn": doc.get("isbn"),
        "publisher": doc.get("publisher"),
        "language": doc.get("language"),
        "pages": doc.get("pages"),
        "ebook_access": doc.get("ebook_access"),
        "pdf_url": None,
        "source": "openlibrary",
        "created_at": None,
    }


def _apply_doc(book: Book, doc: dict, overwrite: bool = False):
    authors = doc.get("authors") or []
    subjects = doc.get("subjects") or []
    values = {
        "title": (doc.get("title") or "Untitled")[:255],
        "author": ", ".join(a["name"] for a in authors)[:255] or None,
        "author_keys": ",".join(a.get("id") or "" for a in authors) or None,
        "category": (category_for_subjects(subjects) or "")[:100] or None,
        "keywords": ", ".join(subjects[:25]) or None,
        "description": doc.get("description"),
        "cover_id": doc.get("cover_id"),
        "first_publish_year": doc.get("first_publish_year"),
        "isbn": (doc.get("isbn") or "")[:20] or None,
        "publisher": (doc.get("publisher") or "")[:255] or None,
        "language": (doc.get("language") or "")[:50] or None,
        "pages": doc.get("pages"),
        "ratings_average": doc.get("ratings_average"),
        "ratings_count": doc.get("ratings_count"),
        "ebook_access": doc.get("ebook_access"),
        "ia_id": (doc.get("ia_id") or "")[:255] or None,
    }
    for column, value in values.items():
        if value is None:
            continue
        if overwrite or getattr(book, column) in (None, ""):
            setattr(book, column, value)


def _insert_missing_books(db: Session, docs: list[dict], keys: list[str]) -> None:
    present = {k for (k,) in db.query(Book.ol_key).filter(Book.ol_key.in_(keys)).all()}
    titles = {d["ol_key"]: (d.get("title") or "Untitled")[:255] for d in docs}
    rows = [{"ol_key": k, "title": titles[k]} for k in keys if k not in present]
    if not rows:
        return
    insert = postgresql.insert if db.get_bind().dialect.name == "postgresql" else sqlite.insert
    db.execute(insert(Book).values(rows).on_conflict_do_nothing(index_elements=["ol_key"]))


def _upsert_docs_once(db: Session, docs: list[dict], keys: list[str]) -> list[Book]:
    _insert_missing_books(db, docs, keys)
    existing = {b.ol_key: b for b in db.query(Book).filter(Book.ol_key.in_(keys)).all()}
    for doc in docs:
        _apply_doc(existing[doc["ol_key"]], doc)
    db.commit()
    return [existing[k] for k in keys]


def upsert_docs(db: Session, docs: list[dict]) -> list[Book]:
    docs = [d for d in docs if d.get("ol_key")]
    if not docs:
        return []
    keys = list(dict.fromkeys(d["ol_key"] for d in docs))
    try:
        return _upsert_docs_once(db, docs, keys)
    except DBAPIError as exc:
        db.rollback()
        if not _is_unique_violation(exc):
            raise
        return _upsert_docs_once(db, docs, keys)


def fetch_work_doc(work_id: str) -> dict | None:
    search_future = _pool.submit(ol.work_search_doc, work_id)
    work_future = _pool.submit(ol.work, work_id)
    try:
        doc = search_future.result()
        work = work_future.result()
    except ol.OpenLibraryError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if not work and not doc:
        return None

    work = work or {}
    doc = doc or {
        "ol_key": work_id,
        "title": work.get("title"),
        "authors": [],
        "subjects": [],
    }
    doc["description"] = ol.text_value(work.get("description"))
    if work.get("subjects"):
        doc["subjects"] = work["subjects"][:25]
    if not doc.get("cover_id") and work.get("covers"):
        doc["cover_id"] = next((c for c in work["covers"] if c and c > 0), None)
    if not doc.get("first_publish_year") and work.get("first_publish_date"):
        match = re.search(r"\d{4}", work["first_publish_date"])
        doc["first_publish_year"] = int(match.group()) if match else None
    if not doc.get("authors") and work.get("authors"):
        author_ids = [ol.strip_key(a.get("author", {}).get("key")) for a in work["authors"]][:3]
        authors = []
        for author_id in author_ids:
            data = ol.author(author_id) if author_id else None
            if data and data.get("name"):
                authors.append({"id": author_id, "name": data["name"]})
        doc["authors"] = authors
    if not doc.get("publisher") or not doc.get("isbn") or not doc.get("pages"):
        try:
            for edition in ol.editions(work_id, limit=10):
                if not doc.get("publisher") and edition.get("publishers"):
                    doc["publisher"] = edition["publishers"][0]
                if not doc.get("isbn"):
                    isbn = (edition.get("isbn_13") or edition.get("isbn_10") or [None])[0]
                    doc["isbn"] = isbn
                if not doc.get("pages") and edition.get("number_of_pages"):
                    doc["pages"] = edition["number_of_pages"]
        except ol.OpenLibraryError:
            pass
    return doc


def resolve_book(db: Session, ref: str, refresh: bool = False) -> Book:
    ref = (ref or "").strip()
    if ref.isdigit():
        book = db.query(Book).filter(Book.id == int(ref)).first()
        if book is None:
            raise HTTPException(status_code=404, detail="Book not found")
        return book

    if not is_work_ref(ref):
        raise HTTPException(status_code=400, detail="Invalid book id")

    book = db.query(Book).filter(Book.ol_key == ref).first()
    if book is not None and not refresh and book.description is not None:
        return book

    doc = fetch_work_doc(ref)
    if doc is None:
        if book is not None:
            return book
        raise HTTPException(status_code=404, detail="Book not found")

    for attempt in range(2):
        if book is None:
            book = Book(ol_key=ref, title=(doc.get("title") or "Untitled")[:255])
            db.add(book)
        _apply_doc(book, doc, overwrite=True)
        if book.description is None:
            book.description = ""
        try:
            db.commit()
            break
        except DBAPIError as exc:
            db.rollback()
            if attempt or not _is_unique_violation(exc):
                raise
            book = db.query(Book).filter(Book.ol_key == ref).first()
    db.refresh(book)
    return book


def availability(book: Book) -> dict:
    links = {"read_url": None, "borrow_url": None, "source_url": None, "access": book.ebook_access}
    if book.pdf_url:
        links["read_url"] = book.pdf_url
    if book.ol_key:
        links["source_url"] = f"https://openlibrary.org/works/{book.ol_key}"
        if book.ebook_access == "public" and book.ia_id:
            links["read_url"] = f"https://archive.org/details/{book.ia_id}"
        elif book.ebook_access == "borrowable":
            links["borrow_url"] = f"https://openlibrary.org/works/{book.ol_key}"
    return links
