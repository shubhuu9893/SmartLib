from sqlalchemy.orm import Session
from ..database.models import Book


def get_all_books(db: Session) -> list[Book]:
    return db.query(Book).all()


def get_book_by_id(db: Session, book_id: int) -> Book | None:
    return db.query(Book).filter(Book.id == book_id).first()


def search_books(db: Session, query: str) -> list[Book]:
    return db.query(Book).filter(
        Book.title.ilike(f"%{query}%")
    ).all()
