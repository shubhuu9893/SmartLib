from sqlalchemy import inspect, text

from .connection import Base, engine
from .models import Book

BOOK_COLUMN_TYPES = {
    "ol_key": "VARCHAR(32)",
    "author_keys": "TEXT",
    "cover_id": "INTEGER",
    "first_publish_year": "INTEGER",
    "isbn": "VARCHAR(20)",
    "publisher": "VARCHAR(255)",
    "language": "VARCHAR(50)",
    "pages": "INTEGER",
    "ratings_average": "FLOAT",
    "ratings_count": "INTEGER",
    "ebook_access": "VARCHAR(32)",
    "ia_id": "VARCHAR(255)",
}


def ensure_schema():
    """Create missing tables and add catalog columns to a pre-existing books table."""
    Base.metadata.create_all(bind=engine)

    existing = {c["name"] for c in inspect(engine).get_columns(Book.__tablename__)}
    missing = [name for name in BOOK_COLUMN_TYPES if name not in existing]

    if not missing:
        return

    with engine.begin() as conn:
        for name in missing:
            conn.execute(text(f"ALTER TABLE books ADD COLUMN {name} {BOOK_COLUMN_TYPES[name]}"))
        if "ol_key" in missing:
            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_books_ol_key ON books (ol_key)"))
