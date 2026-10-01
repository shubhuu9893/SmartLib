"""Book CRUD endpoints – currently only a read list.

The real implementation will interact with the database via SQLAlchemy
sessions. For now we return a static list so that the API is usable during
development and for automated tests.
"""

from fastapi import APIRouter, Depends
from typing import List, Dict

# New imports for read endpoint
from ..auth.firebase import get_current_user
from ..services.catalog_service import resolve_book, availability
from ..services.book_sources import openlibrary_get_pdf_url, gutenberg_get_pdf_url

router = APIRouter()


@router.get("/", response_model=List[Dict[str, str]])
async def list_books() -> List[Dict[str, str]]:  # pragma: no cover – placeholder
    """Return a minimal book catalogue."""
    return [
        {"id": 1, "title": "Sample Book", "author": "Author A"},
        {"id": 2, "title": "Another Title", "author": "Author B"},
    ]