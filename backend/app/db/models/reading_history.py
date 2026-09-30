"""Track a user’s progress through a book.

``progress`` is stored as an integer percentage (0‑100). ``completed`` is a
boolean flag to indicate whether the user finished the book. The model also
keeps track of cumulative reading time in seconds.
"""

from datetime import datetime

from sqlalchemy import Column, Integer, DateTime, Boolean, ForeignKey

from .. import Base


class ReadingHistory(Base):
    __tablename__ = "reading_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_read_at = Column(DateTime)
    progress = Column(Integer, default=0)  # percentage 0-100
    completed = Column(Boolean, default=False)
    reading_time = Column(Integer, default=0)  # seconds
