from datetime import datetime


def iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None
