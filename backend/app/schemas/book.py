from pydantic import BaseModel


class BookBase(BaseModel):
    title: str
    author: str | None = None
    category: str | None = None
    description: str | None = None
    keywords: str | None = None
    pdf_url: str | None = None


class BookCreate(BookBase):
    pass


class BookResponse(BookBase):
    id: int
    created_at: str | None = None

    class Config:
        from_attributes = True
