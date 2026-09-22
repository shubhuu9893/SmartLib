from sqlalchemy.orm import Session


class ReadingService:
    def __init__(self, db: Session):
        self.db = db

    def get_reading_history(self, user_id: int) -> list:
        """Get all reading history for a user."""
        # TODO: Implement with actual ReadingHistory model
        return []

    def update_progress(self, user_id: int, book_id: int, progress: float):
        """Update reading progress for a book."""
        # TODO: Implement with actual ReadingHistory model
        pass
