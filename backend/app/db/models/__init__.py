"""Package exporting all ORM model classes.

Importing here allows other modules to use ``from app.db.models import User``
without worrying about relative imports.
"""

from .user import User
from .interest import Interest
from .user_interest import UserInterest
from .book import Book
from .reading_history import ReadingHistory
from .rating import Rating
from .favorite import Favorite
from .recommendation import Recommendation