#!/usr/bin/env python3
"""Apply the ``init.sql`` migration against a Cloudflare D1 database.

Usage:
    $ pip install -r backend/requirements.txt  # httpx & dotenv
    $ python backend/scripts/run_migration.py

The script is intentionally lightweight – it simply reads the SQL file, sends
it to Cloudflare via the REST API and prints a short success/failure message.
"""

from __future__ import annotations

import os
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv()

ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")
API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN")
DATABASE_ID = os.getenv("D1_DATABASE_ID")
MIGRATION_PATH = Path(__file__).resolve().parent.parent / "migrations" / "init.sql"

if not all([ACCOUNT_ID, API_TOKEN, DATABASE_ID]):  # pragma: no cover - guard
    raise RuntimeError(
        "Missing required env vars: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, D1_DATABASE_ID"
    )

if not MIGRATION_PATH.is_file():  # pragma: no cover - defensive
    raise FileNotFoundError(f"Migration file not found: {MIGRATION_PATH}")


def run_sql(sql: str) -> dict:
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
    sql_text = MIGRATION_PATH.read_text(encoding="utf-8")
    result = run_sql(sql_text)
    # The API returns a status field in the "result" section; success is indicated
    # by the presence of a "rows" key (even if empty) or a simple truthy flag.
    if result.get("success"):
        print("✅ Migration executed successfully. Tables will now exist if they did not before.")
    else:
        print("❌ Migration failed: ", result)


if __name__ == "__main__":  # pragma: no cover
    main()