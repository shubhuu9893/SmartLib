import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BookDetailsView from '../components/books/BookDetails';
import BookRow from '../components/books/BookRow';
import { ErrorState } from '../components/common/States';
import useAsync from '../hooks/useAsync';
import { getBook, getSimilarBooks } from '../api/booksApi';
import { addHistory } from '../api/libraryApi';

function DetailsSkeleton() {
  return (
    <div className="grid gap-8 md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] lg:gap-12" role="status" aria-label="Loading book">
      <div className="skeleton mx-auto aspect-[2/3] w-48 rounded-2xl sm:w-56 md:w-full" />
      <div className="space-y-4">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-10 w-3/4" />
        <div className="skeleton h-5 w-1/3" />
        <div className="flex gap-3 pt-4">
          <div className="skeleton h-10 w-36" />
          <div className="skeleton h-10 w-36" />
        </div>
        <div className="skeleton mt-6 h-40 w-full" />
      </div>
    </div>
  );
}

export default function BookDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const book = useAsync(() => getBook(id), [id]);
  const similar = useAsync(() => getSimilarBooks(id), [id]);

  useEffect(() => {
    if (book.data?.id) addHistory(book.data.id, 'viewed').catch(() => {});
  }, [book.data?.id]);

  useEffect(() => {
    if (book.data?.title) document.title = `${book.data.title} · SmartLib`;
    return () => {
      document.title = 'SmartLib';
    };
  }, [book.data?.title]);

  return (
    <div className="space-y-12">
      <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/dashboard'))} className="-mb-6 inline-flex items-center gap-1.5 rounded text-sm font-medium text-fg-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
      </button>
      {book.loading && <DetailsSkeleton />}
      {book.error && (
        <ErrorState
          error={book.error}
          title={book.error.status === 404 ? 'Book not found.' : 'Something went wrong.'}
          message={book.error.status === 404 ? "We couldn't find this book in the catalog." : book.error.message}
          onRetry={book.error.status === 404 ? undefined : book.reload}
        />
      )}
      {book.data && !book.loading && <BookDetailsView key={book.data.id} book={book.data} />}
      {book.data && (
        <BookRow
          title="Similar Books"
          subtitle="Content-based matches (TF-IDF + cosine similarity)"
          books={similar.data}
          loading={similar.loading}
          error={similar.error}
          onRetry={similar.reload}
        />
      )}
    </div>
  );
}
