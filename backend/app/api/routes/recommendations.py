"""Recommendation endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..auth.firebase import get_current_user
from ..database.connection import get_db
from ..database.models import User
from ..recommendation import get_recommender
from ..recommendation.personalized import personalized_recommendations

router = APIRouter()


@router.get("/", response_model=dict)
async def get_recommendations(
    limit: int = Query(default=24, ge=1, le=60),
    user: User | None = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return a list of personalized book recommendations."""
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    recommender = get_recommender(db)
    return personalized_recommendations(
        recommender,
        user=user,
        db=db,
        limit=limit,
        as_dict=True,
    )