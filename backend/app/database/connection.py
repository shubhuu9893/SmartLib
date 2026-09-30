import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

D1_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")
D1_DATABASE_ID = os.getenv("CLOUDFLARE_D1_DATABASE_ID")
D1_API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN")

USE_D1 = bool(D1_ACCOUNT_ID and D1_DATABASE_ID and D1_API_TOKEN)

if USE_D1:
    DATABASE_URL = URL.create(
        "cloudflare_d1",
        username=D1_ACCOUNT_ID,
        password=D1_API_TOKEN,
        host=D1_DATABASE_ID,
    )
else:
    DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError(
        "Database is not configured: set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID "
        "and CLOUDFLARE_API_TOKEN for Cloudflare D1, or DATABASE_URL"
    )

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=not USE_D1
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
