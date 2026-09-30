"""Simple script to initialise the database for testing.

This is used during the audit to confirm that :func:`app.db.database.init_models`
creates all tables without error. It does not start a server, it only calls the async init
routine in an event loop.
"""

import asyncio
from pathlib import Path
import os
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test.db")
# Provide minimal other required env vars for config validation
os.environ.setdefault("SECRET_KEY", "secret-test-key")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
os.environ.setdefault("OPEN_LIBRARY_BASE_URL", "https://openlibrary.org")

from app.core.config import get_settings
from app.db.database import init_models


async def main():
    # Ensure settings load correctly
    _ = get_settings()
    await init_models()
    print("Database tables created successfully")


if __name__ == "__main__":
    asyncio.run(main())