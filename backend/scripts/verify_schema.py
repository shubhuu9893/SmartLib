"""Utility script to verify that the expected tables exist in a Cloudflare D1 database.

The script uses the Cloudflare D1 REST API which is authenticated via an
environment variable ``CLOUDFLARE_API_TOKEN``.  It also requires the
``CLOUDFLARE_ACCOUNT_ID`` and ``D1_DATABASE_ID`` environment variables to be
set (these are normally provided by the deployment environment or a
`.env` file).

Usage:
    $ pip install -r backend/requirements.txt  # ensure httpx & python-dotenv are available
    $ python backend/scripts/verify_schema.py

The script prints the list of tables currently present in the database and
flags any missing expected tables.  It performs a very small subset of checks
that are sufficient to confirm that the migration ran correctly without
overwriting existing data.
"""

from __future__ import annotations

import os
from pathlib import Path

import httpx
from dotenv import load_dotenv

# Resolve the project root (one level up from this script)
BASE_DIR = Path(__file__).resolve().parents[1]
# Load environment variables from the .env file in the project root.
ENV_FILE = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_FILE)

ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID") or os.getenv("CF_ACCOUNT_ID")
# Prefer the project specific variable, fall back to generic Cloudflare token name
API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN") or os.getenv("CF_API_TOKEN")
# Historically the variable was named CLOUDFLARE_D1_DATABASE_ID.  Keep backward
# compatibility by checking both names.
DATABASE_ID = os.getenv("D1_DATABASE_ID") or os.getenv("CLOUDFLARE_D1_DATABASE_ID")

if not all([ACCOUNT_ID, API_TOKEN, DATABASE_ID]):  # pragma: no cover - guard
    raise RuntimeError(
        "Missing required env vars: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, D1_DATABASE_ID"
    )


def run_sql(sql: str) -> dict:
    """Execute *sql* against the D1 database via Cloudflare's REST API.

    Returns the JSON payload from the API.  Raises httpx.HTTPStatusError if the
    request fails.
    """

    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/databases/{DATABASE_ID}/execute"
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {"sql": sql}

    with httpx.Client(timeout=10) as client:
        response = client.post(url, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()


def main() -> None:
    # Query sqlite_master to list all tables
    result = run_sql("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    rows = result.get("result", {}).get("rows", [])
    current_tables = {row[0] for row in rows}

    print("Current tables:")
    for t in sorted(current_tables):
        print(f"  - {t}")

    expected = {
        "users",
        "interests",
        "user_interests",
        "books",
        "reading_history",
        "ratings",
        "favorites",
        "recommendations",
    }

    missing = expected - current_tables
    if missing:
        print("\nMissing tables:")
        for t in sorted(missing):
            print(f"  - {t}")
    else:
        print("\nAll expected tables are present.")


if __name__ == "__main__":  # pragma: no cover
    main()