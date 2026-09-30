from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth.firebase import get_token_claims, upsert_user_from_claims
from ..database.connection import get_db
from ..services.notification_service import notify
from .users import serialize_user

router = APIRouter(prefix="/auth", tags=["Auth"])


class SyncRequest(BaseModel):
    name: str | None = None


@router.post("/sync")
def sync_user(
    payload: SyncRequest | None = None,
    claims: dict = Depends(get_token_claims),
    db: Session = Depends(get_db),
):
    user, created = upsert_user_from_claims(db, claims, name=(payload.name if payload else None))
    if created:
        notify(
            db,
            user,
            "system",
            "Welcome to SmartLib",
            "Pick your interests and start exploring books to build your personalized library.",
            "/interests",
            dedupe_key="welcome",
        )
    return {"user": serialize_user(db, user), "created": created}
