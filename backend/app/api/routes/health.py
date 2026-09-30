"""Simple health‑check endpoint.

The function simply returns a JSON payload confirming that the API is up. In a
real deployment you might also test connectivity to external services such as
the database or message broker.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/", response_model=dict)
async def health_check() -> dict:  # pragma: no cover – trivial
    return {"status": "ok"}