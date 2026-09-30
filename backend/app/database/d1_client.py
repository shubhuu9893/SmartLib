"""A lightweight Cloudflare D1 HTTP client.

The real Cloudflare D1 REST API accepts SQL statements via a POST request. The
client below uses :pypi:`httpx` to perform these requests synchronously (the
project has been built around sync code).  It reads credentials from the
``backend/.env`` file – no secrets are printed.

Only the minimal API required by this repository is implemented:

* ``execute`` – runs a statement that modifies data or creates schema. Returns
  the raw JSON result from Cloudflare.
* ``query`` – same as :meth:`execute` but returns the list of rows.
* ``execute_many`` – helper for running several statements separated by `;`.

The client deliberately performs very little error handling so that any HTTP
error bubbles up to the caller, which is what the FastAPI startup handler can
capture and report.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import httpx
from dotenv import load_dotenv

# Load the project's .env – it resides in the backend directory.
_ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

CLOUDFLARE_ACCOUNT_ID: str | None = os.getenv("CLOUDFLARE_ACCOUNT_ID")
D1_DATABASE_ID: str | None = os.getenv("D1_DATABASE_ID")
CLOUDFLARE_API_TOKEN: str | None = os.getenv("CLOUDFLARE_API_TOKEN")

if not all([CLOUDFLARE_ACCOUNT_ID, D1_DATABASE_ID, CLOUDFLARE_API_TOKEN]):
    raise RuntimeError(
        "Cloudflare credentials are missing.  Ensure BACKEND/.env contains "
        "CLOUDFLARE_ACCOUNT_ID, D1_DATABASE_ID and CLOUDFLARE_API_TOKEN"
    )

BASE_URL = (
    f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/d1"
)


class D1Client:
    """Simple wrapper around the Cloudflare D1 REST API.

    The client is intentionally synchronous; all network calls are made via
    :mod:`httpx` with ``timeout=None`` to avoid accidental request timeouts
    during startup.  If you need async support, subclass or wrap this class.
    """

    def __init__(self) -> None:
        self.headers = {
            "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
            "Content-Type": "application/json",
        }

    def _query_url(self) -> str:
        return f"{BASE_URL}/sql?db_name={D1_DATABASE_ID}"

    def execute(self, statement: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        payload = {"query": statement}
        if params:
            payload["params"] = params
        response = httpx.post(self._query_url(), headers=self.headers, json=payload)
        response.raise_for_status()
        return response.json()

    def query(self, statement: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        result = self.execute(statement, params=params)
        return result.get("result", [])

    def execute_many(self, statements: Iterable[str]) -> List[Dict[str, Any]]:
        joined = ";\n".join(statements)
        return self.execute(joined).get("result", [])
