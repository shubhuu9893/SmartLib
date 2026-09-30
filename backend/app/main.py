import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database.schema import ensure_schema

from .api.auth import router as auth_router
from .api.books import router as books_router
from .api.catalog import router as catalog_router
from .api.favorites import router as favorites_router
from .api.library import router as library_router
from .api.notifications import router as notifications_router
from .api.ratings import router as ratings_router
from .api.recommendations import router as recommendations_router
from .api.users import router as users_router


ensure_schema()


app = FastAPI(
    title="E-Library Recommendation API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        o.strip()
        for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
        if o.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(books_router)

app.include_router(
    recommendations_router
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(catalog_router)
app.include_router(favorites_router)
app.include_router(ratings_router)
app.include_router(library_router)
app.include_router(notifications_router)


@app.get("/")
def root():

    return {
        "message": "E-Library API is running"
    }
