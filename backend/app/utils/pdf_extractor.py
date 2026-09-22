import fitz  # PyMuPDF


def extract_text_from_pdf(pdf_path: str, max_pages: int = 5) -> str:
    """Extract text from a PDF file using PyMuPDF."""
    try:
        doc = fitz.open(pdf_path)
        text_parts = []

        for page_num in range(min(max_pages, len(doc))):
            page = doc.load_page(page_num)
            text_parts.append(page.get_text())

        doc.close()
        return "\n".join(text_parts)

    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return ""


def extract_metadata(pdf_path: str) -> dict:
    """Extract metadata from a PDF file."""
    try:
        doc = fitz.open(pdf_path)
        meta = doc.metadata
        doc.close()
        return meta

    except Exception as e:
        print(f"Error extracting metadata: {e}")
        return {}
