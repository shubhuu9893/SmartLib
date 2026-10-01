"""Training utility for the BookRecommender model."""

from typing import Optional
from sqlalchemy.orm import Session

from ..database.models import Book
from .recommender import BookRecommender


def train_recommender(
    db: Session,
    recommender: Optional[BookRecommender] = None,
) -> BookRecommender:
    """Train or retrain a BookRecommender on all books in the database."""
    if recommender is None:
        recommender = BookRecommender()

    books = db.query(Book).all()
    if not books:
        recommender.train([])
        return recommender

    recommender.train(books)
    return recommender
