from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth.firebase import get_current_user
from ..database.connection import get_db
from ..database.models import Favorite, User
from ..services.catalog_service import resolve_book, serialize_book
from .deps import iso

router = APIRouter(prefix="/favorites", tags=["Favorites"])


class FavoriteCreate(BaseModel):
    book_id: str


@router.get("")
def list_favorites(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Favorite).filter(Favorite.user_id == user.id).order_by(Favorite.created_at.desc()).all()
    return {"items": [{**serialize_book(r.book), "favorited_at": iso(r.created_at)} for r in rows]}


@router.get("/ids")
def favorite_ids(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Favorite).filter(Favorite.user_id == user.id).all()
    return {"ids": [r.book.ol_key or str(r.book.id) for r in rows]}


@router.post("", status_code=201)
def add_favorite(payload: FavoriteCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    book = resolve_book(db, payload.book_id)
    favorite = db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.book_id == book.id).first()
    if favorite is None:
        favorite = Favorite(user_id=user.id, book_id=book.id)
        db.add(favorite)
        db.commit()
        db.refresh(favorite)
    return {**serialize_book(book), "favorited_at": iso(favorite.created_at)}


@router.delete("/{book_ref}")
def remove_favorite(book_ref: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    book = resolve_book(db, book_ref)
    db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.book_id == book.id).delete()
    db.commit()
    return {"ok": True, "id": book.ol_key or str(book.id)}
