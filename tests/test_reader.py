"""Unit and integration tests for the SmartLib In-App Book Reader."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from backend.app.database.connection import Base
from backend.app.database.models import Book, LibraryEntry, ReadingHistory, User
from backend.app.services.reader_service import (
    is_url_allowed,
    resolve_reader_source,
    get_user_reading_state,
    update_reading_progress,
    sanitize_html,
)


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


def test_url_allowlist_security():
    """Verify trusted domain validation blocks arbitrary and dangerous URLs."""
    assert is_url_allowed("https://archive.org/embed/test123") is True
    assert is_url_allowed("https://openlibrary.org/works/OL123W") is True
    assert is_url_allowed("https://www.gutenberg.org/ebooks/1342") is True
    assert is_url_allowed("https://gutendex.com/books") is True

    # Blocked URLs
    assert is_url_allowed("https://malicious-site.com/steal") is False
    assert is_url_allowed("javascript:alert(1)") is False
    assert is_url_allowed("data:text/html,<html>") is False
    assert is_url_allowed("") is False
    assert is_url_allowed(None) is False


def test_resolve_public_domain_book(db_session: Session):
    """Test resolving a public-domain book with Internet Archive ID."""
    book = Book(
        id=10,
        title="Frankenstein",
        author="Mary Shelley",
        ia_id="frankenstein00shel",
        ebook_access="public",
        pages=280,
    )
    db_session.add(book)
    db_session.commit()

    source = resolve_reader_source(db_session, book)
    assert source["available"] is True
    assert source["access_type"] == "public_domain"
    assert source["reader_type"] == "iframe"
    assert "https://archive.org/embed/frankenstein00shel" in source["reader_url"]
    assert source["embeddable"] is True


def test_resolve_borrowable_book(db_session: Session):
    """Test resolving a CDL digital lending book requiring borrow."""
    book = Book(
        id=11,
        title="Modern Physics",
        author="John Doe",
        ia_id="modernphysics00john",
        ebook_access="borrowable",
        pages=350,
    )
    db_session.add(book)
    db_session.commit()

    source = resolve_reader_source(db_session, book)
    assert source["available"] is True
    assert source["access_type"] == "borrow"
    assert source["reader_type"] == "iframe"
    assert "https://archive.org/embed/modernphysics00john" in source["reader_url"]


def test_resolve_direct_pdf_book(db_session: Session):
    """Test resolving a book with a verified direct PDF."""
    book = Book(
        id=12,
        title="Open Textbook",
        author="Open Author",
        pdf_url="https://archive.org/download/opentextbook/opentextbook.pdf",
        ebook_access="public",
    )
    db_session.add(book)
    db_session.commit()

    source = resolve_reader_source(db_session, book)
    assert source["available"] is True
    assert source["access_type"] == "public_domain"
    assert source["reader_type"] == "pdf"
    assert source["reader_url"] == book.pdf_url


def test_resolve_paid_commercial_book(db_session: Session):
    """Test that recent commercial books without open access are marked paid/unavailable."""
    book = Book(
        id=13,
        title="Recent Bestseller 2024",
        author="Famous Author",
        first_publish_year=2024,
        publisher="Major Publisher",
        ebook_access="unauthorized",
    )
    db_session.add(book)
    db_session.commit()

    source = resolve_reader_source(db_session, book)
    assert source["available"] is False
    assert source["access_type"] in ("paid", "unavailable")
    assert source["embeddable"] is False
    assert "restricted" in source["message"].lower() or "unavailable" in source["message"].lower()


def test_reading_progress_and_history(db_session: Session):
    """Test saving and retrieving reading progress for a user."""
    user = User(id=1, firebase_uid="test_user_reader", name="Reader User")
    book = Book(id=20, title="Reading Test Book", pages=200)
    db_session.add_all([user, book])
    db_session.commit()

    # Initial state
    state = get_user_reading_state(db_session, user, book)
    assert state["progress"] == 0
    assert state["current_page"] == 1

    # Update progress to 42%
    update_res = update_reading_progress(db_session, user, book, progress=42, current_page=84)
    assert update_res["ok"] is True
    assert update_res["progress"] == 42
    assert update_res["status"] == "reading"

    # Verify state persistence
    saved_state = get_user_reading_state(db_session, user, book)
    assert saved_state["progress"] == 42
    assert saved_state["current_page"] == 84

    # Verify reading history was logged
    history_entry = (
        db_session.query(ReadingHistory)
        .filter(ReadingHistory.user_id == user.id, ReadingHistory.book_id == book.id)
        .first()
    )
    assert history_entry is not None
    assert history_entry.action == "read"


def test_sanitize_html():
    """Verify HTML sanitizer removes script tags, event handlers, and iframes."""
    dirty = """
    <div>
        <h1>Title</h1>
        <script>alert('xss');</script>
        <p onclick="steal()">Safe paragraph</p>
        <iframe src="evil.com"></iframe>
        <a href="javascript:void(0)">Link</a>
    </div>
    """
    clean = sanitize_html(dirty)
    assert "<script" not in clean
    assert "onclick" not in clean
    assert "<iframe" not in clean
    assert "javascript:" not in clean
    assert "Safe paragraph" in clean
