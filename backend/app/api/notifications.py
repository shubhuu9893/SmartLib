from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth.firebase import get_current_user
from ..database.connection import get_db
from ..database.models import Favorite, Notification, User
from ..services import openlibrary as ol
from ..services.notification_service import notify
from .deps import iso

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def serialize_notification(n: Notification) -> dict:
    return {
        "id": n.id,
        "kind": n.kind,
        "title": n.title,
        "message": n.message,
        "link": n.link,
        "read": n.read,
        "created_at": iso(n.created_at),
    }


def _get_owned(db: Session, user: User, notification_id: int) -> Notification:
    n = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user.id).first()
    if n is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    return n


@router.get("")
def list_notifications(limit: int = 50, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    base = db.query(Notification).filter(Notification.user_id == user.id)
    rows = base.order_by(Notification.created_at.desc(), Notification.id.desc()).limit(max(1, min(limit, 200))).all()
    unread = base.filter(Notification.read.is_(False)).count()
    return {"items": [serialize_notification(n) for n in rows], "unread": unread}


@router.post("/refresh")
def refresh_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Check the authors of the user's favorite books for recently published works."""
    favorites = db.query(Favorite).filter(Favorite.user_id == user.id).order_by(Favorite.created_at.desc()).all()
    author_ids = []
    for fav in favorites:
        for key in (fav.book.author_keys or "").split(","):
            if key and key not in author_ids:
                author_ids.append(key)
    min_year = datetime.utcnow().year - 1
    created = 0
    for author_id in author_ids[:5]:
        try:
            works = ol.raw_query(
                f"author_key:{author_id} AND first_publish_year:[{min_year} TO *]", limit=1, sort="new"
            )["items"]
        except ol.OpenLibraryError:
            continue
        if not works:
            continue
        work = works[0]
        author_name = next((a["name"] for a in work["authors"] if a.get("id") == author_id), None) or "An author you like"
        if notify(
            db,
            user,
            "author",
            "Your favorite author has new books",
            f"{author_name} published {work['title']} ({work.get('first_publish_year')}).",
            f"/book/{work['ol_key']}",
            dedupe_key=f"author:{author_id}:{work['ol_key']}",
        ):
            created += 1
    return {"created": created}


@router.post("/read-all")
def read_all(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == user.id, Notification.read.is_(False)).update(
        {Notification.read: True}
    )
    db.commit()
    return {"ok": True}


@router.post("/{notification_id}/read")
def mark_read(notification_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = _get_owned(db, user, notification_id)
    n.read = True
    db.commit()
    return serialize_notification(n)


@router.delete("/{notification_id}")
def delete_notification(notification_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = _get_owned(db, user, notification_id)
    db.delete(n)
    db.commit()
    return {"ok": True}
