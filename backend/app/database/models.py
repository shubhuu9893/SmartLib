import json

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    TypeDecorator,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .connection import Base


class JSONText(TypeDecorator):
    """JSON stored as TEXT, for dialects without native JSON support (Cloudflare D1)."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return None if value is None else json.dumps(value)

    def process_result_value(self, value, dialect):
        return None if value is None else json.loads(value)


PortableJSON = JSON().with_variant(JSONText(), "cloudflare_d1")


class Book(Base):

    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(255), nullable=False)

    author = Column(String(255))

    category = Column(String(100))

    description = Column(Text)

    keywords = Column(Text)

    pdf_url = Column(Text)

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

    ol_key = Column(String(32), unique=True, index=True)

    author_keys = Column(Text)

    cover_id = Column(Integer)

    first_publish_year = Column(Integer)

    isbn = Column(String(20))

    publisher = Column(String(255))

    language = Column(String(50))

    pages = Column(Integer)

    ratings_average = Column(Float)

    ratings_count = Column(Integer)

    ebook_access = Column(String(32))

    ia_id = Column(String(255))


class User(Base):

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    firebase_uid = Column(String(128), unique=True, nullable=False, index=True)

    email = Column(String(255))

    name = Column(String(255))

    avatar_url = Column(Text)

    bio = Column(Text)

    preferences = Column(PortableJSON, default=dict)

    onboarded = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, server_default=func.now())

    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class UserInterest(Base):

    __tablename__ = "user_interests"
    __table_args__ = (UniqueConstraint("user_id", "interest"),)

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)

    interest = Column(String(100), nullable=False)

    created_at = Column(DateTime, server_default=func.now())


class Favorite(Base):

    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "book_id"),)

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)

    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False)

    created_at = Column(DateTime, server_default=func.now())

    book = relationship(Book, lazy="joined")


class Rating(Base):

    __tablename__ = "ratings"
    __table_args__ = (UniqueConstraint("user_id", "book_id"),)

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)

    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False)

    rating = Column(Integer, nullable=False)

    created_at = Column(DateTime, server_default=func.now())

    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    book = relationship(Book, lazy="joined")


class LibraryEntry(Base):

    __tablename__ = "library_entries"
    __table_args__ = (UniqueConstraint("user_id", "book_id"),)

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)

    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False)

    status = Column(String(20), nullable=False)

    progress = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime, server_default=func.now())

    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    book = relationship(Book, lazy="joined")


class ReadingHistory(Base):

    __tablename__ = "reading_history"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)

    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False)

    action = Column(String(20), nullable=False)

    created_at = Column(DateTime, server_default=func.now(), index=True)

    book = relationship(Book, lazy="joined")


class SearchHistory(Base):

    __tablename__ = "search_history"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)

    query = Column(String(255), nullable=False)

    created_at = Column(DateTime, server_default=func.now(), index=True)


class Notification(Base):

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)

    kind = Column(String(40), nullable=False)

    title = Column(String(255), nullable=False)

    message = Column(Text)

    link = Column(String(255))

    dedupe_key = Column(String(255), index=True)

    read = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, server_default=func.now(), index=True)
