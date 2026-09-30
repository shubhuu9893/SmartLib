"""Recommendation endpoints – placeholder implementations.

The real logic would generate a ranked list of books for the authenticated
user. For now we simply expose a stub that returns an empty list.
"""

from fastapi import APIRouter, Depends
from typing import List, Dict

router = APIRouter()


@router.get("/", response_model=List[Dict[str, str]])
async def get_recommendations() -> List[Dict[str, str]]:  # pragma: no cover – placeholder
    return []