"""Adapters for discovering publicly available PDF URLs.

The project currently supports two source types:
* Open Library (via the official API)
* Project Gutenberg (via gutendex public API)

Each adapter exposes a single ``get_pdf_url`` function that accepts a
``Book`` ORM instance and returns either a string URL or ``None`` if no
authorized PDF could be found.

The adapters are intentionally lightweight; they perform minimal HTTP
requests and never persist data to the database or any external storage.
"""

from .open_library import get_pdf_url as openlibrary_get_pdf_url  # noqa: F401
from .gutenberg import get_pdf_url as gutenberg_get_pdf_url  # noqa: F401