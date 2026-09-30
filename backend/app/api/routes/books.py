"""Book CRUD endpoints – currently only a read list.

The real implementation will interact with the database via SQLAlchemy
sessions. For now we return a static list so that the API is usable during
development and for automated tests.
"""

from fastapi import APIRouter, Depends
from typing import List, Dict

router = APIRouter()


@router.get("/", response_model=List[Dict[str, str]])
async def list_books() -> List[Dict[str, str]]:  # pragma: no cover – placeholder
    """Return a minimal book catalogue."""
    return [
        {"id": 1, "title": "Sample Book", "author": "Author A"},
        {"id": 2, "title": "Another Title", "author": "Author B"},
    ]