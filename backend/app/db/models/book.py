"""Book domain model.

All fields that may be optional are declared with ``nullable=True``. The
``open_library_key`` field (e.g. ``OL123M``) is unique – it acts as the source
identity for a book imported from Open Library.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, Integer, String, Text, DateTime

# Import the declarative base from the parent ``db`` package.
from .. import Base


class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    open_library_key = Column(String(32), unique=True, nullable=False, index=True)
    title = Column(String(256), nullable=False)
    subtitle = Column(String(256))
    authors = Column(Text)  # JSON string or comma separated – keep simple
    description = Column(Text)
    subjects = Column(Text)
    genres = Column(Text)
    cover_url = Column(String(512))
    published_date = Column(DateTime)
    publisher = Column(String(256))
    isbn = Column(String(32))
    page_count = Column(Integer)
    language = Column(String(64))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)