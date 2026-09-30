"""Convenience re‑exports for all Pydantic schema modules.

Importing from ``backend.app.schemas`` gives quick access to the most common
schema classes without having to remember their submodule paths.
"""

from .auth import Token, TokenData, UserCreate, UserOut
from .user import InterestBase, InterestCreate, InterestInDB, UserInterests
from .book import BookBase, BookCreate, BookOut
from .history import HistoryBase, HistoryCreate, HistoryOut
from .rating import RatingBase, RatingCreate, RatingOut
from .favorite import FavoriteBase, FavoriteCreate, FavoriteOut
from .recommendation import RecommendationBase, RecommendationCreate, RecommendationOut