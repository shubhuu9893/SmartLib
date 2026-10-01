"""TF-IDF and Cosine Similarity Book Recommendation Engine."""

from typing import Any, Dict, List, Optional, Set

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .preprocessing import create_book_text


class BookRecommender:
    """TF-IDF + Cosine Similarity recommendation engine.

    Supports:
    1. User-profile-vector to book recommendations (personalized)
    2. Book-to-book similarity recommendations (similar books / 'Because You Like')
    3. Query-to-book recommendations (search based)
    """

    def __init__(
        self,
        max_features: int = 10000,
        min_df: int = 1,
        max_df: float = 0.95,
    ):
        self.max_features = max_features
        self.min_df = min_df
        self.max_df = max_df

        self.vectorizer: Optional[TfidfVectorizer] = None
        self.books: List[Any] = []
        self.book_vectors = None

        # Maps book ID and ol_key -> index in self.books
        self.book_index: Dict[Any, int] = {}
        self.is_trained = False

    # ---------------------------------------------------------
    # TRAIN MODEL
    # ---------------------------------------------------------

    def train(self, books: List[Any]) -> None:
        """Train TF-IDF vectorizer on the supplied books."""
        if not books:
            self.books = []
            self.book_vectors = None
            self.book_index = {}
            self.is_trained = False
            return

        self.books = list(books)

        documents = [create_book_text(book) for book in self.books]
        # Prevent completely empty documents
        documents = [doc if doc.strip() else "unknown" for doc in documents]

        # In small catalogs (e.g. tests or early stage), max_df=0.95 might drop terms
        # that appear in 2 out of 2 or 3 out of 3 books.
        effective_max_df = 1.0 if len(self.books) < 10 else self.max_df

        self.vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=self.max_features,
            min_df=self.min_df,
            max_df=effective_max_df,
            lowercase=True,
            strip_accents="unicode",
            ngram_range=(1, 2),
            sublinear_tf=True,
        )

        self.book_vectors = self.vectorizer.fit_transform(documents)

        self.book_index = {}
        for index, book in enumerate(self.books):
            book_id = self._get_book_id(book)
            if book_id is not None:
                self.book_index[book_id] = index
                self.book_index[str(book_id)] = index

            ol_key = self._get_value(book, "ol_key", None)
            if ol_key:
                self.book_index[ol_key] = index

        self.is_trained = True

    # ---------------------------------------------------------
    # BOOK -> BOOK RECOMMENDATION
    # ---------------------------------------------------------

    def recommend(
        self,
        book_id: Any,
        top_n: int = 5,
        exclude_ids: Optional[Set[Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Find books similar to a given book ID using cosine similarity."""
        if not self.is_trained or self.book_vectors is None:
            return []

        target_index = self.book_index.get(book_id)
        if target_index is None:
            target_index = self.book_index.get(str(book_id))

        if target_index is None:
            return []

        if top_n <= 0:
            return []

        exclude_ids = set(exclude_ids or ())
        exclude_ids.add(book_id)
        exclude_ids.add(str(book_id))

        target_vector = self.book_vectors[target_index]
        similarity_scores = cosine_similarity(target_vector, self.book_vectors).flatten()

        similar_indices = np.argsort(similarity_scores)[::-1]

        recommendations = []
        for index in similar_indices:
            current_book = self.books[index]
            current_id = self._get_book_id(current_book)
            current_ol_key = self._get_value(current_book, "ol_key")

            if current_id in exclude_ids or str(current_id) in exclude_ids:
                continue
            if current_ol_key and current_ol_key in exclude_ids:
                continue

            score = float(similarity_scores[index])
            # For similar books, require positive similarity
            if score <= 0.0:
                continue

            recommendations.append(self._format_recommendation(current_book, score))
            if len(recommendations) >= top_n:
                break

        return recommendations

    # ---------------------------------------------------------
    # USER PROFILE -> BOOK RECOMMENDATION
    # ---------------------------------------------------------

    def recommend_for_profile(
        self,
        profile_text: str,
        top_n: int = 10,
        exclude_ids: Optional[Set[Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Generate recommendations from user's preference text."""
        if not self.is_trained or self.book_vectors is None or self.vectorizer is None:
            return []

        if not profile_text or not profile_text.strip():
            return []

        profile_vector = self.vectorizer.transform([profile_text])
        return self.recommend_for_vector(
            user_vector=profile_vector,
            top_n=top_n,
            exclude_ids=exclude_ids,
        )

    # ---------------------------------------------------------
    # USER VECTOR -> BOOK RECOMMENDATION
    # ---------------------------------------------------------

    def recommend_for_vector(
        self,
        user_vector: Any,
        top_n: int = 10,
        exclude_ids: Optional[Set[Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Generate recommendations directly from a weighted TF-IDF user profile vector."""
        if not self.is_trained or self.book_vectors is None or user_vector is None:
            return []

        if top_n <= 0:
            return []

        exclude_ids = set(exclude_ids or ())
        str_exclude_ids = {str(i) for i in exclude_ids if i is not None}

        similarity_scores = cosine_similarity(user_vector, self.book_vectors).flatten()

        ranked_indices = np.argsort(similarity_scores)[::-1]

        recommendations = []
        for index in ranked_indices:
            book = self.books[index]
            book_id = self._get_book_id(book)
            ol_key = self._get_value(book, "ol_key")

            if book_id in exclude_ids or str(book_id) in str_exclude_ids:
                continue
            if ol_key and (ol_key in exclude_ids or ol_key in str_exclude_ids):
                continue

            score = float(similarity_scores[index])

            # Discard only negative scores; zero scores are allowed so candidates can be returned
            if score < 0.0:
                continue

            recommendations.append(self._format_recommendation(book, score))

            if len(recommendations) >= top_n:
                break

        return recommendations

    # ---------------------------------------------------------
    # CREATE USER PROFILE VECTOR
    # ---------------------------------------------------------

    def create_profile_vector(
        self,
        profile_documents: List[str],
        weights: Optional[List[float]] = None,
    ):
        """Create a weighted, normalized user profile vector from signal documents."""
        if not self.is_trained or self.vectorizer is None or not profile_documents:
            return None

        cleaned_pairs = [
            (doc.strip(), float(weights[i] if weights is not None and i < len(weights) else 1.0))
            for i, doc in enumerate(profile_documents)
            if doc and doc.strip()
        ]

        if not cleaned_pairs:
            return None

        docs = [p[0] for p in cleaned_pairs]
        wts = [p[1] for p in cleaned_pairs]

        vectors = self.vectorizer.transform(docs)

        # Apply weights to each sparse row
        weighted_vectors = []
        for idx, w in enumerate(wts):
            weighted_vectors.append(vectors[idx] * float(w))

        # Sum all preference vectors
        profile_vector = weighted_vectors[0]
        for v in weighted_vectors[1:]:
            profile_vector = profile_vector + v

        # L2-normalize profile vector
        sum_sq = profile_vector.multiply(profile_vector).sum()
        if sum_sq > 0:
            norm = np.sqrt(sum_sq)
            profile_vector = profile_vector / norm

        return profile_vector

    # ---------------------------------------------------------
    # SEARCH-BASED RECOMMENDATION
    # ---------------------------------------------------------

    def recommend_from_query(
        self,
        query: str,
        top_n: int = 10,
        exclude_ids: Optional[Set[Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Recommend books based on a search/query string."""
        return self.recommend_for_profile(
            profile_text=query,
            top_n=top_n,
            exclude_ids=exclude_ids,
        )

    # ---------------------------------------------------------
    # GET BOOK
    # ---------------------------------------------------------

    def get_book(self, book_id: Any) -> Optional[Any]:
        """Return a trained book by ID or ol_key."""
        idx = self.book_index.get(book_id)
        if idx is None:
            idx = self.book_index.get(str(book_id))
        if idx is None:
            return None
        return self.books[idx]

    # ---------------------------------------------------------
    # MODEL STATUS
    # ---------------------------------------------------------

    def status(self) -> Dict[str, Any]:
        """Return model metadata for health/monitoring."""
        vocab_size = 0
        if self.is_trained and self.vectorizer is not None:
            try:
                vocab_size = len(self.vectorizer.vocabulary_)
            except Exception:
                vocab_size = 0

        return {
            "trained": self.is_trained,
            "books": len(self.books),
            "features": vocab_size,
        }

    # ---------------------------------------------------------
    # INTERNAL HELPERS
    # ---------------------------------------------------------

    @staticmethod
    def _get_book_id(book: Any) -> Any:
        if isinstance(book, dict):
            return book.get("id") or book.get("book_id")
        return getattr(book, "id", getattr(book, "book_id", None))

    @staticmethod
    def _get_value(book: Any, field: str, default: Any = None) -> Any:
        if isinstance(book, dict):
            return book.get(field, default)
        return getattr(book, field, default)

    def _format_recommendation(self, book: Any, similarity: float) -> Dict[str, Any]:
        """Convert a book object into a dictionary with both score and similarity."""
        score_val = round(max(0.0, float(similarity)), 4)
        book_id = self._get_book_id(book)

        return {
            "id": book_id,
            "book_id": book_id,
            "title": self._get_value(book, "title", "") or "Untitled",
            "author": self._get_value(book, "author", "") or "Unknown author",
            "category": self._get_value(book, "category", "") or "",
            "description": self._get_value(book, "description", "") or "",
            "cover_id": self._get_value(book, "cover_id", None),
            "ol_key": self._get_value(book, "ol_key", None),
            "rating": self._get_value(book, "ratings_average", None),
            "rating_count": self._get_value(book, "ratings_count", 0),
            "first_publish_year": self._get_value(book, "first_publish_year", None),
            "score": score_val,
            "similarity": score_val,
        }