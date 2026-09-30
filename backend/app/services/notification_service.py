from sqlalchemy.orm import Session

from ..database.models import Notification, User

PREFERENCE_BY_KIND = {
    "recommendations": "notify_recommendations",
    "library": "notify_library",
    "author": "notify_authors",
}


def notify(
    db: Session,
    user: User,
    kind: str,
    title: str,
    message: str | None = None,
    link: str | None = None,
    dedupe_key: str | None = None,
    commit: bool = True,
) -> Notification | None:
    preference = PREFERENCE_BY_KIND.get(kind)
    if preference and (user.preferences or {}).get(preference) is False:
        return None
    if dedupe_key:
        exists = db.query(Notification.id).filter(
            Notification.user_id == user.id, Notification.dedupe_key == dedupe_key
        ).first()
        if exists:
            return None
    notification = Notification(
        user_id=user.id, kind=kind, title=title, message=message, link=link, dedupe_key=dedupe_key
    )
    db.add(notification)
    if commit:
        db.commit()
    return notification
