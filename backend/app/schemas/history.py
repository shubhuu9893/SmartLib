"""Schemas for reading history entries."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from pydantic import ConfigDict


class HistoryBase(BaseModel):
    book_id: int
    progress: int = 0  # percentage
    completed: bool = False
    reading_time: int = 0


class HistoryCreate(HistoryBase):
    pass


class HistoryOut(HistoryBase):
    id: int
    user_id: int
    started_at: datetime
    last_read_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)