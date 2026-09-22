from sqlalchemy.orm import Session

from ..database.models import Book
from .recommender import BookRecommender


def train_recommender(db: Session):

    books = db.query(Book).all()

    recommender = BookRecommender()

    if len(books) == 0:
        return recommender

    recommender.train(books)

    return recommender
