from fastapi import FastAPI

from .database.connection import Base, engine

from .api.books import router as books_router
from .api.recommendations import router as recommendations_router


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="E-Library Recommendation API",
    version="1.0.0"
)


app.include_router(books_router)

app.include_router(
    recommendations_router
)


@app.get("/")
def root():

    return {
        "message": "E-Library API is running"
    }
