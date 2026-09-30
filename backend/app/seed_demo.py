"""Create (or reset) the SmartLib demo account.

Usage (from backend/): python -m app.seed_demo
"""

import os

from firebase_admin import auth as firebase_auth

from .auth.firebase import _firebase_app
from .database.connection import SessionLocal
from .database.models import User, UserInterest
from .database.schema import ensure_schema

DEMO_EMAIL = os.getenv("DEMO_USER_EMAIL", "demo@smartlib.dev")
DEMO_PASSWORD = os.getenv("DEMO_USER_PASSWORD", "Demo@1234")
DEMO_NAME = os.getenv("DEMO_USER_NAME", "Demo Reader")
DEMO_INTERESTS = ["fiction", "science", "technology", "history", "mystery"]


def ensure_firebase_user() -> str:
    app = _firebase_app()
    try:
        record = firebase_auth.get_user_by_email(DEMO_EMAIL, app=app)
        firebase_auth.update_user(record.uid, password=DEMO_PASSWORD, display_name=DEMO_NAME, app=app)
    except firebase_auth.UserNotFoundError:
        record = firebase_auth.create_user(
            email=DEMO_EMAIL,
            password=DEMO_PASSWORD,
            display_name=DEMO_NAME,
            email_verified=True,
            app=app,
        )
    return record.uid


def ensure_db_user(uid: str) -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.firebase_uid == uid).first()
        if user is None:
            user = User(firebase_uid=uid, preferences={})
            db.add(user)
        user.email = DEMO_EMAIL
        user.name = DEMO_NAME
        user.onboarded = True
        db.flush()
        existing = {i.interest for i in db.query(UserInterest).filter(UserInterest.user_id == user.id)}
        for interest in DEMO_INTERESTS:
            if interest not in existing:
                db.add(UserInterest(user_id=user.id, interest=interest))
        db.commit()
    finally:
        db.close()


def main() -> None:
    ensure_schema()
    uid = ensure_firebase_user()
    ensure_db_user(uid)
    print(f"Demo account ready: {DEMO_EMAIL} / {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
