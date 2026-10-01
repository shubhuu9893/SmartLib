from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth.firebase import get_current_user
from ..database.connection import get_db
from ..database.models import (
    Favorite,
    LibraryEntry,
    Rating,
    ReadingHistory,
    SearchHistory,
    User,
    UserInterest,
)
from ..recommendation.personalized import personalized_recommendations
from ..services.categories import CATEGORIES
from ..services.notification_service import notify
from .deps import iso

router = APIRouter(prefix="/users/me", tags=["Users"])

DEFAULT_PREFERENCES = {
    "notify_recommendations": True,
    "notify_library": True,
    "notify_authors": True,
}
ALLOWED_PREFERENCES = set(DEFAULT_PREFERENCES)


def user_interests(db: Session, user: User) -> list[str]:
    rows = db.query(UserInterest).filter(UserInterest.user_id == user.id).order_by(UserInterest.id).all()
    return [r.interest for r in rows]


def serialize_user(db: Session, user: User) -> dict:
    interests = user_interests(db, user)
    return {
        "id": user.id,
        "firebase_uid": user.firebase_uid,
        "email": user.email,
        "name": user.name,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "preferences": {**DEFAULT_PREFERENCES, **(user.preferences or {})},
        "interests": interests,
        "needs_onboarding": not user.onboarded and not interests,
        "created_at": iso(user.created_at),
    }


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    avatar_url: str | None = Field(default=None, max_length=2000)
    bio: str | None = Field(default=None, max_length=1000)
    preferences: dict[str, bool] | None = None


class InterestsUpdate(BaseModel):
    interests: list[str] = Field(default_factory=list, max_length=50)


@router.get("")
def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return serialize_user(db, user)


@router.patch("")
def update_me(payload: ProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="Name cannot be empty")
        user.name = name
    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url.strip() or None
    if payload.bio is not None:
        user.bio = payload.bio.strip() or None
    if payload.preferences is not None:
        unknown = set(payload.preferences) - ALLOWED_PREFERENCES
        if unknown:
            raise HTTPException(status_code=422, detail=f"Unknown preferences: {', '.join(sorted(unknown))}")
        user.preferences = {**(user.preferences or {}), **payload.preferences}
    db.commit()
    db.refresh(user)
    return serialize_user(db, user)


@router.get("/interests")
def get_interests(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"interests": user_interests(db, user), "available": CATEGORIES}


@router.put("/interests")
def put_interests(payload: InterestsUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cleaned = list(dict.fromkeys(i.strip()[:100] for i in payload.interests if i and i.strip()))
    before = set(user_interests(db, user))
    db.query(UserInterest).filter(UserInterest.user_id == user.id).delete()
    for interest in cleaned:
        db.add(UserInterest(user_id=user.id, interest=interest))
    user.onboarded = True
    db.commit()
    if set(cleaned) != before and cleaned:
        notify(
            db,
            user,
            "recommendations",
            "New recommendations available",
            f"Your recommendations were refreshed for {', '.join(cleaned[:3])}{'…' if len(cleaned) > 3 else ''}.",
            "/recommended",
        )
    return {"interests": cleaned}


@router.get("/stats")
def get_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    favorites = db.query(Favorite).filter(Favorite.user_id == user.id).all()
    ratings = db.query(Rating).filter(Rating.user_id == user.id).all()
    library = db.query(LibraryEntry).filter(LibraryEntry.user_id == user.id).all()
    history_count = db.query(func.count(ReadingHistory.id)).filter(ReadingHistory.user_id == user.id).scalar()

    status_counts = Counter(e.status for e in library)
    category_counts = Counter()
    for row in [*favorites, *ratings, *library]:
        if row.book and row.book.category:
            category_counts[row.book.category] += 1

    return {
        "favorites": len(favorites),
        "ratings": len(ratings),
        "average_rating": round(sum(r.rating for r in ratings) / len(ratings), 2) if ratings else None,
        "books_read": status_counts.get("completed", 0),
        "currently_reading": status_counts.get("reading", 0),
        "want_to_read": status_counts.get("want_to_read", 0),
        "history": history_count or 0,
        "top_categories": [{"name": n, "count": c} for n, c in category_counts.most_common(6)],
    }


@router.get("/recommendations")
def get_recommendations(
    limit: int = 24,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from ..recommendation import get_recommender

    recommender = get_recommender(db)
    return personalized_recommendations(
        recommender,
        user=user,
        db=db,
        limit=max(1, min(limit, 60)),
        as_dict=True,
    )


@router.get("/search-history")
def get_search_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(SearchHistory)
        .filter(SearchHistory.user_id == user.id)
        .order_by(SearchHistory.created_at.desc())
        .limit(20)
        .all()
    )
    return {"items": [{"id": r.id, "query": r.query, "created_at": iso(r.created_at)} for r in rows]}


@router.delete("/search-history")
def clear_search_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(SearchHistory).filter(SearchHistory.user_id == user.id).delete()
    db.commit()
    return {"ok": True}
