from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..recommendation.train import train_recommender


router = APIRouter(
    prefix="/recommendations",
    tags=["Recommendations"]
)


@router.get("/{book_id}")
def get_recommendations(
    book_id: int,
    top_n: int = 5,
    db: Session = Depends(get_db)
):

    recommender = train_recommender(db)

    recommendations = recommender.recommend(
        book_id,
        top_n
    )

    if not recommendations:
        raise HTTPException(
            status_code=404,
            detail="Book not found or no recommendations available"
        )

    return {
        "book_id": book_id,
        "recommendations": recommendations
    }
