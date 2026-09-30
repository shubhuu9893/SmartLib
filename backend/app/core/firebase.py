"""Firebase authentication utilities.

This module provides a thin wrapper around the `firebase_admin` SDK that is
convenient for use in FastAPI route dependencies. The backend initialises a
single Firebase app on import using the service account JSON path supplied via
the :class:`~backend.app.core.config.Settings` configuration.

Only the minimal functionality required by the application is exposed:

* ``initialize_firebase`` – called at module import to create the SDK app if a
  service‑account file is configured.
* ``verify_id_token(token: str) -> dict`` – validates an ID token sent from
  the client and returns the decoded payload. If verification fails, a
  :class:`fastapi.HTTPException` with status code 401 is raised.

The module intentionally keeps the Firebase SDK out of route handlers to avoid
re‑initialising it on each request.
"""

from __future__ import annotations

import os
from typing import Any, Dict

import firebase_admin
from firebase_admin import auth as _auth
from firebase_admin import credentials as _cred
from fastapi import HTTPException, status

from .config import get_settings

__all__ = ["initialize_firebase", "verify_id_token"]


def initialize_firebase() -> None:
    """Initialise the Firebase SDK.

    The function reads :data:`~backend.app.core.config.Settings.FIREBASE_SERVICE_ACCOUNT_PATH`
    from configuration. If a path is provided and no Firebase app has been
    initialised yet, it loads the service account JSON file and creates a new
    default app. Subsequent calls are idempotent.
    """

    settings = get_settings()
    # Do nothing if no credentials are configured – this allows running the
    # backend without Firebase (useful for testing or local dev when the
    # frontend does not yet support it).
    if not settings.FIREBASE_SERVICE_ACCOUNT_PATH:
        return

    if len(firebase_admin._apps) == 0:  # type: ignore[attr-defined]
        try:
            cred = _cred.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
            firebase_admin.initialize_app(cred)
        except Exception as exc:  # pragma: no cover – initialization error
            raise RuntimeError(
                f"Failed to initialise Firebase SDK with {settings.FIREBASE_SERVICE_ACCOUNT_PATH}: {exc}"
            ) from exc


def verify_id_token(token: str) -> Dict[str, Any]:
    """Verify a Firebase ID token and return its decoded payload.

    Parameters
    ----------
    token:
        The raw ID token string sent in the ``Authorization`` header by the
        client.

    Returns
    -------
    dict
        Decoded claims as returned by Firebase.
    """

    try:
        decoded = _auth.verify_id_token(token)
    except Exception as exc:  # pragma: no cover – token errors
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Firebase ID token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    return decoded


# Initialise on import – this keeps the logic out of individual request
# handlers and ensures a single global app.
initialize_firebase()