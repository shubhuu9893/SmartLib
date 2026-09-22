from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func

from .connection import Base


class Book(Base):

    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(255), nullable=False)

    author = Column(String(255))

    category = Column(String(100))

    description = Column(Text)

    keywords = Column(Text)

    pdf_url = Column(Text)

    created_at = Column(
        DateTime,
        server_default=func.now()
    )
