from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..database.models import Book


router = APIRouter(
    prefix="/books",
    tags=["Books"]
)


@router.get("/")
def get_books(
    db: Session = Depends(get_db)
):

    books = db.query(Book).all()

    return books


@router.get("/{book_id}")
def get_book(
    book_id: int,
    db: Session = Depends(get_db)
):

    book = db.query(Book).filter(
        Book.id == book_id
    ).first()

    return book
