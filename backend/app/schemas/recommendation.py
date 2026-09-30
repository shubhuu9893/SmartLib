"""Schemas for book recommendations."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from pydantic import ConfigDict


class RecommendationBase(BaseModel):
    book_id: int
    score: float
    reason: Optional[str] = None


class RecommendationCreate(RecommendationBase):
    pass


class RecommendationOut(RecommendationBase):
    id: int
    user_id: int
    generated_at: datetime

    model_config = ConfigDict(from_attributes=True)