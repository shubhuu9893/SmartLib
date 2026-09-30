CATEGORIES = [
    {"id": "technology", "name": "Technology", "subject": "technology", "match": ["technology", "computers", "internet"]},
    {"id": "science", "name": "Science", "subject": "science", "match": ["science", "physics", "chemistry", "biology"]},
    {"id": "ai-ml", "name": "AI & ML", "subject": "artificial_intelligence", "match": ["artificial intelligence", "machine learning", "neural networks"]},
    {"id": "programming", "name": "Programming", "subject": "programming", "match": ["programming", "software", "computer programming"]},
    {"id": "business", "name": "Business", "subject": "business", "match": ["business", "management", "entrepreneurship"]},
    {"id": "finance", "name": "Finance", "subject": "finance", "match": ["finance", "investing", "money", "economics"]},
    {"id": "history", "name": "History", "subject": "history", "match": ["history"]},
    {"id": "fiction", "name": "Fiction", "subject": "fiction", "match": ["fiction"]},
    {"id": "fantasy", "name": "Fantasy", "subject": "fantasy", "match": ["fantasy"]},
    {"id": "romance", "name": "Romance", "subject": "romance", "match": ["romance", "love stories"]},
    {"id": "mystery", "name": "Mystery", "subject": "mystery_and_detective_stories", "match": ["mystery", "detective", "crime", "thriller"]},
    {"id": "biography", "name": "Biography", "subject": "biography", "match": ["biography", "autobiography", "memoir"]},
    {"id": "self-help", "name": "Self Help", "subject": "self-help", "match": ["self-help", "self help", "personal development", "success"]},
    {"id": "psychology", "name": "Psychology", "subject": "psychology", "match": ["psychology"]},
    {"id": "engineering", "name": "Engineering", "subject": "engineering", "match": ["engineering"]},
    {"id": "mathematics", "name": "Mathematics", "subject": "mathematics", "match": ["mathematics", "algebra", "calculus", "statistics"]},
    {"id": "science-fiction", "name": "Science Fiction", "subject": "science_fiction", "match": ["science fiction"]},
    {"id": "philosophy", "name": "Philosophy", "subject": "philosophy", "match": ["philosophy"]},
    {"id": "poetry", "name": "Poetry", "subject": "poetry", "match": ["poetry"]},
    {"id": "health", "name": "Health", "subject": "health", "match": ["health", "nutrition", "medicine"]},
]

CATEGORY_BY_ID = {c["id"]: c for c in CATEGORIES}
CATEGORY_BY_NAME = {c["name"].lower(): c for c in CATEGORIES}


def find_category(value: str | None) -> dict | None:
    if not value:
        return None
    key = value.strip().lower()
    return CATEGORY_BY_ID.get(key) or CATEGORY_BY_NAME.get(key)


def category_for_subjects(subjects: list[str]) -> str | None:
    lowered = [s.lower() for s in subjects]
    for category in CATEGORIES:
        if category["id"] == "fiction":
            continue
        for needle in category["match"]:
            if any(needle in s for s in lowered):
                return category["name"]
    if any("fiction" in s for s in lowered):
        return "Fiction"
    return subjects[0][:100] if subjects else None
