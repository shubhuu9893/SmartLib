from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..auth.firebase import get_current_user
from ..database.connection import get_db
from ..database.models import Rating, User
from ..services.catalog_service import resolve_book, serialize_book
from .deps import iso

router = APIRouter(prefix="/ratings", tags=["Ratings"])


class RatingUpsert(BaseModel):
    rating: int = Field(ge=1, le=5)


def serialize_rating(rating: Rating) -> dict:
    return {
        "book": serialize_book(rating.book),
        "rating": rating.rating,
        "created_at": iso(rating.created_at),
        "updated_at": iso(rating.updated_at),
    }


@router.get("")
def list_ratings(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Rating).filter(Rating.user_id == user.id).order_by(Rating.updated_at.desc()).all()
    return {"items": [serialize_rating(r) for r in rows]}


@router.put("/{book_ref}")
def upsert_rating(
    book_ref: str,
    payload: RatingUpsert,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    book = resolve_book(db, book_ref)
    rating = db.query(Rating).filter(Rating.user_id == user.id, Rating.book_id == book.id).first()
    if rating is None:
        rating = Rating(user_id=user.id, book_id=book.id, rating=payload.rating)
        db.add(rating)
    else:
        rating.rating = payload.rating
    db.commit()
    db.refresh(rating)
    return serialize_rating(rating)


@router.delete("/{book_ref}")
def delete_rating(book_ref: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    book = resolve_book(db, book_ref)
    db.query(Rating).filter(Rating.user_id == user.id, Rating.book_id == book.id).delete()
    db.commit()
    return {"ok": True, "id": book.ol_key or str(book.id)}
