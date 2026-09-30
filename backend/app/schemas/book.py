"""Pydantic schemas for books and related operations."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel
from pydantic import ConfigDict


class BookBase(BaseModel):
    open_library_key: str
    title: str
    subtitle: Optional[str] = None
    authors: Optional[List[str]] = None
    description: Optional[str] = None
    subjects: Optional[List[str]] = None
    genres: Optional[List[str]] = None
    cover_url: Optional[str] = None
    published_date: Optional[datetime] = None
    publisher: Optional[str] = None
    isbn: Optional[str] = None
    page_count: Optional[int] = None
    language: Optional[str] = None


class BookCreate(BookBase):
    pass


class BookOut(BookBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)