"""Interest domain model.

Interests are generic tags like "Science Fiction", "Data Science" etc. They are
shared across users.
"""

from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship

from .. import Base


class Interest(Base):
    __tablename__ = "interests"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), unique=True, nullable=False)
    description = Column(Text)

    users = relationship("User", secondary="user_interests", back_populates="interests")