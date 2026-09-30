"""Authentication endpoints.

Only minimal placeholder logic is provided – the real implementation will use
password hashing and JWT generation from :mod:`app.core.security`.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from typing import Dict, Any

router = APIRouter()


class _LoginRequest(BaseModel):
    email: str
    password: str


# ---------------------------------------------------------------------------
# Firebase authentication helper
# ---------------------------------------------------------------------------

from ..core.firebase import verify_id_token

def get_current_user(request: Request) -> Dict[str, Any]:
    """FastAPI dependency that verifies the Firebase ID token.

    The frontend should send a request header ``Authorization: Bearer <id-token>``.
    This helper extracts the token, validates it with Firebase and returns
    the decoded claims. If verification fails, a 401 error is raised.
    """

    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header.split(" ", 1)[1]
    return verify_id_token(token)  # returns dict of claims


@router.get("/me")
async def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    """Return the current user's Firebase claims.

    This endpoint is useful for the frontend to confirm authentication and to
    retrieve user‑specific data such as email or UID. It simply echoes back the
    decoded token payload.
    """
    return user