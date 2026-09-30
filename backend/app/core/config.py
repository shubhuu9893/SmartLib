"""Application configuration using Pydantic and dotenv.

The settings are loaded from ``.env`` files by default – use ``dotenv.load_dotenv()`` so the process can be started without manually exporting environment variables.
"""

import os
from pathlib import Path
from typing import List, Optional

# NOTE:
# The original project used Pydantic v1 ``BaseSettings`` with the legacy
# ``class Config`` approach.  In Pydantic v2 the configuration model has
# changed to a *model_config* attribute defined on the Settings class.
# We also move the settings loader into the pydantic-settings package so
# that environment variables are automatically read from the .env file.

# NOTE: In Pydantic v2 the ``BaseSettings`` class lives in the
# ``pydantic_settings`` package. Importing it from ``pydantic`` raises a
# :class:`PydanticImportError`.  The previous change accidentally left the
# import statement pointing to ``pydantic``, which caused the server start‑up
# failure you saw.
from pydantic_settings import BaseSettings
from pydantic import Field
from pydantic_settings import SettingsConfigDict
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # Database
    # Database connection string – required for SQLAlchemy
    DATABASE_URL: str = Field(..., env="DATABASE_URL")

    # JWT settings
    SECRET_KEY: str = Field(..., env="SECRET_KEY")
    ALGORITHM: str = Field("HS256", env="ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(60, env="ACCESS_TOKEN_EXPIRE_MINUTES")

    # Open Library
    OPEN_LIBRARY_BASE_URL: str = Field("https://openlibrary.org", env="OPEN_LIBRARY_BASE_URL")

    # CORS
    CORS_ORIGINS: str = Field("http://localhost:5173", env="CORS_ORIGINS")  # comma‑separated list
    # Firebase service account JSON file path. The backend will load the file at
    # startup and use it to initialise the firebase_admin SDK.
    FIREBASE_SERVICE_ACCOUNT_PATH: Optional[str] = Field(
        None,
        env="FIREBASE_SERVICE_ACCOUNT_PATH",
        description=(
            "Path to a Firebase service account JSON file used by the backend. "
            "If not provided, Firebase authentication will be disabled."
        ),
    )

    # ``pydantic-settings`` uses a SettingsConfigDict to declare environment file
    # loading and other configuration options.
    # Resolve the absolute path to ``backend/.env`` regardless of the current working directory.
    _env_path = Path(__file__).resolve().parents[2] / ".env"
    model_config = SettingsConfigDict(
        env_file=_env_path,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # ignore unknown variables – same behaviour as the old Config
    )


from functools import lru_cache


@lru_cache(maxsize=1)
def get_settings() -> Settings:  # pragma: no cover – trivial caching wrapper
    """Return a cached :class:`Settings` instance.

    The ``@lru_cache`` decorator guarantees that only one instance is
    created during the lifetime of the application process. It mirrors the
    FastAPI recommended pattern while staying compatible with Pydantic v2.
    """
    return Settings()