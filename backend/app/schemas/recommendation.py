from pydantic import BaseModel


class RecommendationItem(BaseModel):
    id: int
    title: str
    author: str | None = None
    category: str | None = None
    similarity: float


class RecommendationResponse(BaseModel):
    book_id: int
    recommendations: list[RecommendationItem]
