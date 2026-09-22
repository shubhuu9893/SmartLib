def create_book_text(book):
    """Combine book information into one piece of text for TF-IDF processing."""
    title = book.title or ""
    author = book.author or ""
    category = book.category or ""
    description = book.description or ""
    keywords = book.keywords or ""

    text = (
        title + " " +
        author + " " +
        category + " " +
        description + " " +
        keywords
    )

    return text
