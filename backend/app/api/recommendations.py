"""Book recommendation endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..auth.firebase import get_current_user
from ..database.connection import get_db
from ..database.models import User
from ..recommendation import get_recommender
from ..recommendation.personalized import personalized_recommendations

router = APIRouter(
    prefix="/recommendations",
    tags=["Recommendations"],
)


@router.get("/status")
def get_recommendation_status(db: Session = Depends(get_db)):
    """Return model status (training status, book count, feature dimensions)."""
    recommender = get_recommender(db)
    return recommender.status()


@router.get("/")
def get_personalized_recommendations(
    limit: int = Query(default=24, ge=1, le=60),
    user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Personalized recommendations ranked with TF-IDF + cosine similarity.

    Over user interests, favorites, ratings, library, reading history, and search history.
    """
    recommender = get_recommender(db)
    if user is None:
        return {
            "items": [],
            "because": [],
            "authors": [],
            "has_signals": False,
            "algorithm": "tfidf-cosine",
            "message": "User not authenticated.",
        }

    return personalized_recommendations(
        recommender,
        user=user,
        db=db,
        limit=limit,
        as_dict=True,
    )


@router.get("/{book_id}")
def get_similar_books(
    book_id: int,
    top_n: int = Query(default=5, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Find books similar to a given book using TF-IDF + cosine similarity."""
    recommender = get_recommender(db)
    recommendations = recommender.recommend(book_id, top_n)

    if not recommendations:
        # Check if book exists
        book = recommender.get_book(book_id)
        if book is None:
            raise HTTPException(
                status_code=404,
                detail="Book not found in recommendation catalog",
            )
        return {
            "book_id": book_id,
            "recommendations": [],
            "algorithm": "tfidf-cosine",
        }

    return {
        "book_id": book_id,
        "recommendations": recommendations,
        "algorithm": "tfidf-cosine",
    }
