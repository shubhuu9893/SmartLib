import os

import firebase_admin
from fastapi import Depends, Header, HTTPException, status
from firebase_admin import auth as firebase_auth
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..database.models import User

_app = None


def _firebase_app():
    global _app
    if _app is not None:
        return _app

    project_id = os.getenv("FIREBASE_PROJECT_ID")
    credentials_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")

    if not project_id and not credentials_path:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase authentication is not configured on the server (set FIREBASE_PROJECT_ID)",
        )

    credential = firebase_admin.credentials.Certificate(credentials_path) if credentials_path else None
    options = {"projectId": project_id} if project_id else None
    _app = firebase_admin.initialize_app(credential, options)
    return _app


def _extract_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token


def verify_token(authorization: str | None) -> dict:
    token = _extract_token(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    try:
        return firebase_auth.verify_id_token(token, app=_firebase_app())
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc


def get_token_claims(authorization: str | None = Header(default=None)) -> dict:
    return verify_token(authorization)


def upsert_user_from_claims(db: Session, claims: dict, name: str | None = None) -> tuple[User, bool]:
    uid = claims["uid"]
    user = db.query(User).filter(User.firebase_uid == uid).first()
    created = False

    if user is None:
        user = User(
            firebase_uid=uid,
            email=claims.get("email"),
            name=name or claims.get("name") or (claims.get("email") or "").split("@")[0] or None,
            avatar_url=claims.get("picture"),
            preferences={},
        )
        db.add(user)
        created = True
    else:
        if claims.get("email") and user.email != claims.get("email"):
            user.email = claims.get("email")
        if name and not user.name:
            user.name = name
        if claims.get("picture") and not user.avatar_url:
            user.avatar_url = claims.get("picture")

    db.commit()
    db.refresh(user)
    return user, created


def get_current_user(
    claims: dict = Depends(get_token_claims),
    db: Session = Depends(get_db),
) -> User:
    user = db.query(User).filter(User.firebase_uid == claims["uid"]).first()
    if user is None:
        user, _ = upsert_user_from_claims(db, claims)
    return user


def get_optional_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User | None:
    if not _extract_token(authorization):
        return None
    try:
        claims = verify_token(authorization)
    except HTTPException:
        return None
    return db.query(User).filter(User.firebase_uid == claims["uid"]).first()
