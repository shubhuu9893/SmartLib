"""Many‑to‑many join table between users and interests."""

from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint

from .. import Base


class UserInterest(Base):
    __tablename__ = "user_interests"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    interest_id = Column(Integer, ForeignKey("interests.id", ondelete="CASCADE"), primary_key=True)

    __table_args__ = (UniqueConstraint("user_id", "interest_id", name="uq_user_interest"),)