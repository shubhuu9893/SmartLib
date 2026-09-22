import os


def generate_pdf_url(book_id: int, filename: str) -> str:
    """Generate a signed URL or storage path for PDF access."""
    storage_base = os.getenv("STORAGE_BASE_URL", "http://localhost:8000/storage")
    return f"{storage_base}/books/{book_id}/{filename}"


def validate_pdf_extension(filename: str) -> bool:
    """Check if the file is a valid PDF."""
    return filename.lower().endswith(".pdf")
