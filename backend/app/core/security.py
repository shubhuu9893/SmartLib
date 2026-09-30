"""JWT token creation and verification, password hashing utilities.

Uses ``passlib`` with the ``bcrypt`` scheme for password storage. The
functions are intentionally stateless so they can be unit‑tested without a DB.
"""

from datetime import datetime, timedelta
from typing import Optional

import jwt
from passlib.context import CryptContext

from ..core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plain password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return ``True`` if the plain password matches the hashed one."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token.

    Parameters
    ----------
    data:
        Payload to encode – typically ``{"sub": user.id}``.
    expires_delta:
        How long the token is valid for. Defaults to the setting value.
    """
    settings = get_settings()
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta if expires_delta else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str):
    """Decode a JWT token and validate its expiry.

    Raises ``jwt.PyJWTError`` if validation fails – callers should translate this into HTTP 401.
    """
    settings = get_settings()
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    return payload