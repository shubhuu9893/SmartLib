from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..auth.firebase import get_current_user
from ..database.connection import get_db
from ..database.models import LibraryEntry, ReadingHistory, User
from ..services.catalog_service import resolve_book, serialize_book
from ..services.notification_service import notify
from .deps import iso

router = APIRouter(prefix="/library", tags=["Library"])

Status = Literal["reading", "want_to_read", "completed"]
STATUS_LABELS = {"reading": "Currently Reading", "want_to_read": "Want to Read", "completed": "Completed"}


class LibraryUpsert(BaseModel):
    status: Status
    progress: int | None = Field(default=None, ge=0, le=100)


class HistoryCreate(BaseModel):
    book_id: str
    action: Literal["viewed", "opened"] = "viewed"


def serialize_entry(entry: LibraryEntry) -> dict:
    return {
        "book": serialize_book(entry.book),
        "status": entry.status,
        "progress": entry.progress,
        "added_at": iso(entry.created_at),
        "updated_at": iso(entry.updated_at),
    }


@router.get("")
def list_library(
    status: Status | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(LibraryEntry).filter(LibraryEntry.user_id == user.id)
    if status:
        query = query.filter(LibraryEntry.status == status)
    rows = query.order_by(LibraryEntry.updated_at.desc()).all()
    return {"items": [serialize_entry(r) for r in rows]}


@router.put("/{book_ref}")
def upsert_entry(
    book_ref: str,
    payload: LibraryUpsert,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    book = resolve_book(db, book_ref)
    entry = db.query(LibraryEntry).filter(LibraryEntry.user_id == user.id, LibraryEntry.book_id == book.id).first()
    previous = entry.status if entry else None
    if entry is None:
        entry = LibraryEntry(user_id=user.id, book_id=book.id, status=payload.status, progress=0)
        db.add(entry)
    entry.status = payload.status
    if payload.progress is not None:
        entry.progress = payload.progress
    if payload.status == "completed":
        entry.progress = 100
    db.commit()
    db.refresh(entry)
    if previous != payload.status:
        notify(
            db,
            user,
            "library",
            "Your reading list was updated",
            f"{book.title} moved to {STATUS_LABELS[payload.status]}.",
            "/library",
        )
    return serialize_entry(entry)


@router.delete("/{book_ref}")
def delete_entry(book_ref: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    book = resolve_book(db, book_ref)
    db.query(LibraryEntry).filter(LibraryEntry.user_id == user.id, LibraryEntry.book_id == book.id).delete()
    db.commit()
    return {"ok": True, "id": book.ol_key or str(book.id)}


@router.get("/history")
def list_history(limit: int = 50, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(ReadingHistory)
        .filter(ReadingHistory.user_id == user.id)
        .order_by(ReadingHistory.created_at.desc())
        .limit(max(1, min(limit, 200)))
        .all()
    )
    return {
        "items": [
            {"id": r.id, "book": serialize_book(r.book), "action": r.action, "created_at": iso(r.created_at)}
            for r in rows
        ]
    }


@router.post("/history", status_code=201)
def add_history(payload: HistoryCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    book = resolve_book(db, payload.book_id)
    last = (
        db.query(ReadingHistory)
        .filter(ReadingHistory.user_id == user.id)
        .order_by(ReadingHistory.created_at.desc())
        .first()
    )
    if last and last.book_id == book.id and last.action == payload.action:
        return {"id": last.id, "created_at": iso(last.created_at)}
    item = ReadingHistory(user_id=user.id, book_id=book.id, action=payload.action)
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "created_at": iso(item.created_at)}


@router.delete("/history")
def clear_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(ReadingHistory).filter(ReadingHistory.user_id == user.id).delete()
    db.commit()
    return {"ok": True}
