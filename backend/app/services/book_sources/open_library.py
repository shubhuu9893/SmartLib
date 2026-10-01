"""Open Library PDF discovery.

The Open Library API exposes a field ``ebook_access`` that indicates whether the
book is publicly available, borrowable or not.  When ``ebook_access ==
"public"`` and an ``ia_id`` (Internet Archive identifier) is present we can
construct a direct link to the PDF hosted by Internet Archive.

The function returns ``None`` if no PDF can be constructed.
"""

from __future__ import annotations

import re
from typing import Optional

# Import the Book model from the top‑level database package.
# The relative import must go up two levels (app.services.book_sources -> app.services -> app)
from ...database.models import Book

# Regular expression to validate the IA ID – it consists of alphanumerics and
# some symbols but for our purposes we keep it simple.
_IA_ID_RE = re.compile(r"^[\w-]+$")


def get_pdf_url(book: Book) -> Optional[str]:  # pragma: no cover – trivial wrapper
    """Return a PDF URL for the given ``book`` if it is publicly available.

    Parameters
    ----------
    book:
        SQLAlchemy model instance representing a book record.
    """
    # If the book already has an explicit pdf_url, trust it.
    if getattr(book, "pdf_url", None):  # type: ignore[arg-type]
        return book.pdf_url

    # Open Library public PDFs are served via Internet Archive. The URL pattern
    # is ``https://archive.org/download/{ia_id}/{ia_id}.pdf``.
    ia_id = getattr(book, "ia_id", None)
    if not isinstance(ia_id, str) or not _IA_ID_RE.match(ia_id):
        return None

    # Only expose the link if the book's ``ebook_access`` flag indicates that it
    # is publicly readable.
    if getattr(book, "ebook_access", None) != "public":  # type: ignore[arg-type]
        return None

    return f"https://archive.org/download/{ia_id}/{ia_id}.pdf"