from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .preprocessing import create_book_text


class BookRecommender:

    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            stop_words="english"
        )

        self.books = []
        self.book_vectors = None

    def train(self, books):

        self.books = books

        documents = [
            create_book_text(book)
            for book in books
        ]

        self.book_vectors = self.vectorizer.fit_transform(
            documents
        )

    def recommend(self, book_id, top_n=5):

        if not self.books:
            return []

        target_index = None

        for index, book in enumerate(self.books):

            if book.id == book_id:
                target_index = index
                break

        if target_index is None:
            return []

        similarity_scores = cosine_similarity(
            self.book_vectors[target_index],
            self.book_vectors
        ).flatten()

        similar_indices = similarity_scores.argsort()[::-1]

        recommendations = []

        for index in similar_indices:

            if index == target_index:
                continue

            recommendations.append({
                "id": self.books[index].id,
                "title": self.books[index].title,
                "author": self.books[index].author,
                "category": self.books[index].category,
                "similarity": round(
                    float(similarity_scores[index]),
                    3
                )
            })

            if len(recommendations) >= top_n:
                break

        return recommendations
