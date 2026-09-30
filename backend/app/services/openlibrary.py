"""Thin, cached client for the public Open Library API."""

import re
import threading
import time

import httpx

BASE_URL = "https://openlibrary.org"
COVER_URL = "https://covers.openlibrary.org/b/id/{cover_id}-{size}.jpg"
AUTHOR_PHOTO_URL = "https://covers.openlibrary.org/a/olid/{olid}-{size}.jpg"

SEARCH_FIELDS = ",".join([
    "key", "title", "author_name", "author_key", "cover_i", "first_publish_year",
    "subject", "ratings_average", "ratings_count", "ebook_access", "ia", "isbn",
    "publisher", "language", "number_of_pages_median", "edition_count",
])

WORK_ID_RE = re.compile(r"^OL\d+W$")
AUTHOR_ID_RE = re.compile(r"^OL\d+A$")


class OpenLibraryError(Exception):
    pass


_client = httpx.Client(
    base_url=BASE_URL,
    timeout=httpx.Timeout(20.0, connect=10.0),
    headers={"User-Agent": "SmartLib/1.0 (digital library)"},
    follow_redirects=True,
)
_cache: dict[str, tuple[float, object]] = {}
_cache_lock = threading.Lock()


def _get(path: str, params: dict | None = None, ttl: int = 900):
    key = path + "?" + "&".join(f"{k}={v}" for k, v in sorted((params or {}).items()))
    now = time.time()
    with _cache_lock:
        hit = _cache.get(key)
        if hit and hit[0] > now:
            return hit[1]
    try:
        response = _client.get(path, params=params)
    except httpx.HTTPError as exc:
        raise OpenLibraryError(f"Open Library request failed: {exc}") from exc
    if response.status_code == 404:
        return None
    if response.status_code >= 400:
        raise OpenLibraryError(f"Open Library returned {response.status_code}")
    data = response.json()
    with _cache_lock:
        if len(_cache) > 2000:
            _cache.clear()
        _cache[key] = (now + ttl, data)
    return data


def cover_url(cover_id, size="M"):
    return COVER_URL.format(cover_id=cover_id, size=size) if cover_id else None


def author_photo_url(olid, size="M"):
    return AUTHOR_PHOTO_URL.format(olid=olid, size=size) if olid else None


def strip_key(key: str | None) -> str | None:
    return key.rsplit("/", 1)[-1] if key else None


def text_value(value) -> str | None:
    if isinstance(value, dict):
        return value.get("value")
    return value


def normalize_doc(doc: dict) -> dict:
    """Normalize a search/trending/subject work doc into SmartLib's book shape."""
    authors = doc.get("authors")
    if authors:
        author_list = [{"id": strip_key(a.get("key")), "name": a.get("name")} for a in authors]
    else:
        names = doc.get("author_name") or []
        keys = doc.get("author_key") or []
        author_list = [
            {"id": keys[i] if i < len(keys) else None, "name": name}
            for i, name in enumerate(names)
        ]

    subjects = doc.get("subject") or []
    ia = doc.get("ia")
    if isinstance(ia, list):
        ia = ia[0] if ia else None
    languages = doc.get("language") or []
    isbns = doc.get("isbn") or []
    publishers = doc.get("publisher") or []
    cover_id = doc.get("cover_i") or doc.get("cover_id")

    return {
        "ol_key": strip_key(doc.get("key")),
        "title": doc.get("title") or "Untitled",
        "authors": [a for a in author_list if a["name"]],
        "cover_id": cover_id,
        "first_publish_year": doc.get("first_publish_year"),
        "subjects": subjects[:25],
        "ratings_average": doc.get("ratings_average"),
        "ratings_count": doc.get("ratings_count"),
        "ebook_access": doc.get("ebook_access") or ("public" if doc.get("public_scan") else None),
        "ia_id": ia,
        "isbn": isbns[0] if isbns else None,
        "publisher": publishers[0] if publishers else None,
        "language": languages[0] if languages else None,
        "pages": doc.get("number_of_pages_median"),
        "edition_count": doc.get("edition_count"),
    }


def search(query: str, field: str = "all", page: int = 1, limit: int = 20, sort: str | None = None) -> dict:
    params = {"fields": SEARCH_FIELDS, "page": page, "limit": limit}
    if field == "title":
        params["title"] = query
    elif field == "author":
        params["author"] = query
    elif field == "subject":
        params["subject"] = query
    elif field == "isbn":
        params["isbn"] = re.sub(r"[^0-9Xx]", "", query)
    else:
        params["q"] = query
    if sort:
        params["sort"] = sort
    data = _get("/search.json", params, ttl=600) or {}
    return {
        "total": data.get("numFound", 0),
        "items": [normalize_doc(d) for d in data.get("docs", [])],
    }


def raw_query(q: str, page: int = 1, limit: int = 20, sort: str | None = None, ttl: int = 1800) -> dict:
    params = {"q": q, "fields": SEARCH_FIELDS, "page": page, "limit": limit}
    if sort:
        params["sort"] = sort
    data = _get("/search.json", params, ttl=ttl) or {}
    return {
        "total": data.get("numFound", 0),
        "items": [normalize_doc(d) for d in data.get("docs", [])],
    }


def trending(period: str = "daily", page: int = 1, limit: int = 20) -> list[dict]:
    data = _get(f"/trending/{period}.json", {"page": page, "limit": limit}, ttl=1800) or {}
    return [normalize_doc(d) for d in data.get("works", [])]


def subject(slug: str, page: int = 1, limit: int = 20) -> dict:
    data = _get(
        f"/subjects/{slug}.json",
        {"limit": limit, "offset": (page - 1) * limit},
        ttl=3600,
    ) or {}
    items = []
    for work in data.get("works", []):
        doc = normalize_doc(work)
        availability = work.get("availability") or {}
        doc["ia_id"] = doc["ia_id"] or availability.get("identifier")
        items.append(doc)
    return {"name": data.get("name") or slug, "total": data.get("work_count", 0), "items": items}


def work_search_doc(work_id: str) -> dict | None:
    data = _get("/search.json", {"q": f'key:"/works/{work_id}"', "fields": SEARCH_FIELDS}, ttl=3600) or {}
    docs = data.get("docs") or []
    return normalize_doc(docs[0]) if docs else None


def work(work_id: str) -> dict | None:
    data = _get(f"/works/{work_id}.json", ttl=3600)
    if data and data.get("type", {}).get("key") == "/type/redirect" and data.get("location"):
        return work(strip_key(data["location"]))
    return data


def editions(work_id: str, limit: int = 10) -> list[dict]:
    data = _get(f"/works/{work_id}/editions.json", {"limit": limit}, ttl=3600) or {}
    return data.get("entries", [])


def author(author_id: str) -> dict | None:
    return _get(f"/authors/{author_id}.json", ttl=3600)


def author_works(author_id: str, page: int = 1, limit: int = 20) -> dict:
    data = _get(
        "/search.json",
        {"author_key": author_id, "fields": SEARCH_FIELDS, "page": page, "limit": limit, "sort": "editions"},
        ttl=3600,
    ) or {}
    return {"total": data.get("numFound", 0), "items": [normalize_doc(d) for d in data.get("docs", [])]}


def search_authors(query: str, page: int = 1, limit: int = 20) -> dict:
    data = _get("/search/authors.json", {"q": query, "page": page, "limit": limit}, ttl=3600) or {}
    return {
        "total": data.get("numFound", 0),
        "items": [normalize_author_doc(d) for d in data.get("docs", [])],
    }


def normalize_author_doc(doc: dict) -> dict:
    olid = strip_key(doc.get("key"))
    return {
        "id": olid,
        "name": doc.get("name"),
        "photo_url": author_photo_url(olid),
        "top_work": doc.get("top_work"),
        "work_count": doc.get("work_count"),
        "top_subjects": (doc.get("top_subjects") or [])[:5],
        "birth_date": doc.get("birth_date"),
        "death_date": doc.get("death_date"),
    }
