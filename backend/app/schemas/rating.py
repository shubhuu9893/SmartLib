"""Schemas for book ratings."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, confloat
from pydantic import ConfigDict


class RatingBase(BaseModel):
    book_id: int
    rating: confloat(ge=1, le=5)


class RatingCreate(RatingBase):
    pass


class RatingOut(RatingBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)