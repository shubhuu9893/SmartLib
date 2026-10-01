"""Project Gutenberg PDF discovery.

Gutendex is a public API that mirrors the Project Gutenberg catalogue and
provides URLs for all publicly licensed works.  We query it by ISBN – if the
book has an ISBN we look up the first matching record and return the URL of
the file with ``media_type == "application/pdf"``.

The function is intentionally simple and does not cache results; callers can
implement memoisation in a higher‑level service if required.
"""

from __future__ import annotations

import httpx
from typing import Optional

from ...database.models import Book

GUTENDEX_BASE = "https://gutendex.com/books"


def get_pdf_url(book: Book) -> Optional[str]:  # pragma: no cover – simple HTTP call
    isbn = getattr(book, "isbn", None)
    if not isinstance(isbn, str) or len(isbn.strip()) == 0:
        return None

    query = f"{GUTENDEX_BASE}?search={isbn}"
    try:
        resp = httpx.get(query, timeout=5.0)
    except Exception:  # pragma: no cover – network failure
        return None
    if resp.status_code != 200:
        return None
    data = resp.json()
    results = data.get("results", [])
    for book_data in results:
        media_files = book_data.get("media_files", [])
        for mf in media_files:
            if mf.get("format") == "application/pdf":
                return mf.get("download_url")
    return None