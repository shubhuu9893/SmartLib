import { Link } from 'react-router-dom';
import BookCover from './BookCover';
import { RatingDisplay } from './RatingStars';

export default function BookListItem({ book, meta, children }) {
  return (
    <article className="card flex gap-4 p-3 sm:p-4">
      <Link to={`/book/${encodeURIComponent(book.id)}`} className="shrink-0 overflow-hidden rounded-lg" aria-label={`Open ${book.title}`}>
        <BookCover src={book.coverUrl} title={book.title} className="h-28 w-[74px] sm:h-32 sm:w-[86px]" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link to={`/book/${encodeURIComponent(book.id)}`} className="line-clamp-2 font-semibold text-fg hover:text-brand-cyan">
          {book.title}
        </Link>
        <p className="mt-0.5 truncate text-sm text-fg-muted">{book.author}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <RatingDisplay value={book.rating} count={book.ratingCount} />
          {book.category && <span className="text-xs text-fg-subtle">{book.category}</span>}
          {meta && <span className="text-xs text-fg-subtle">{meta}</span>}
        </div>
        {children && <div className="mt-auto pt-3">{children}</div>}
      </div>
    </article>
  );
}
