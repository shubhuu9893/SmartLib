"""Persisted recommendations – one per user/book.

The ``score`` field stores the similarity value (0‑1). The ``reason`` column is a short textual explanation that can be derived at recommendation time. In production, you might recompute these periodically.
"""

from datetime import datetime

from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime

from .. import Base


class Recommendation(Base):
    __tablename__ = "recommendations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False)
    score = Column(Float, nullable=False)
    reason = Column(String(256))
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)