"""Schemas for users and interests.

The original project shipped with a simplistic user schema. For this
implementation we replace it with a more expressive one that matches the
database model. The new schemas include Pydantic validation, ORM mode and
helper types for interest management.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr
from pydantic import ConfigDict

class InterestBase(BaseModel):
    name: str
    description: Optional[str] = None


class InterestCreate(InterestBase):
    pass


class InterestInDB(InterestBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class UserInterests(BaseModel):
    interests: List[InterestInDB] = []