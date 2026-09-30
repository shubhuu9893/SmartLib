import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ExternalLink, Library } from 'lucide-react';
import BookCover from './BookCover';
import FavoriteButton from './FavoriteButton';
import RatingStars, { RatingDisplay } from './RatingStars';
import LibraryStatusMenu from './LibraryStatusMenu';
import { useApp } from '../../context/AppContext';
import { languageName } from '../../utils/format';
import { addHistory } from '../../api/libraryApi';

function Meta({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-fg-subtle">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-fg">{value}</dd>
    </div>
  );
}

const ACCESS_LABELS = {
  public: { label: 'Free to read', style: 'bg-success/15 text-success' },
  borrowable: { label: 'Borrowable', style: 'bg-brand/15 text-brand' },
  printdisabled: { label: 'Print-disabled access', style: 'bg-warning/15 text-warning' },
  no_ebook: { label: 'No e-book available', style: 'bg-ink-800 text-fg-muted' },
};

export default function BookDetails({ book }) {
  const { getRating, setRating } = useApp();
  const [status, setStatus] = useState(book.userState?.library_status || null);
  const [expanded, setExpanded] = useState(false);
  const myRating = getRating(book.id) || book.userState?.rating || 0;
  const links = book.availability || {};
  const access = ACCESS_LABELS[links.access];
  const longDescription = (book.description || '').length > 600;

  return (
    <article className="grid gap-8 md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] lg:gap-12">
      <div className="mx-auto w-48 sm:w-56 md:mx-0 md:w-full">
        <BookCover src={book.coverUrl?.replace('-M.jpg', '-L.jpg')} title={book.title} author={book.author} eager className="aspect-[2/3] w-full rounded-2xl shadow-card ring-1 ring-white/5" />
      </div>

      <div className="min-w-0">
        {book.category && <p className="mb-2 text-sm font-medium text-brand-cyan">{book.category}</p>}
        <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-4xl">{book.title}</h1>
        <p className="mt-2 text-base text-fg-muted">
          by{' '}
          {book.authors.length
            ? book.authors.map((a, i) => (
                <span key={`${a.name}-${i}`}>
                  {i > 0 && ', '}
                  {a.id ? (
                    <Link to={`/author/${a.id}`} className="rounded font-medium text-fg hover:text-brand-cyan">
                      {a.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-fg">{a.name}</span>
                  )}
                </span>
              ))
            : book.author}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <RatingDisplay value={book.rating} count={book.ratingCount} size="md" />
          {access && <span className={`rounded-md px-2 py-1 text-xs font-semibold ${access.style}`}>{access.label}</span>}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {links.read_url && (
            <a href={links.read_url} target="_blank" rel="noopener noreferrer" className="btn-gradient" onClick={() => addHistory(book.id, 'opened').catch(() => {})}>
              <BookOpen className="h-4 w-4" aria-hidden="true" /> Read Now
            </a>
          )}
          {!links.read_url && links.borrow_url && (
            <a href={links.borrow_url} target="_blank" rel="noopener noreferrer" className="btn-primary" onClick={() => addHistory(book.id, 'opened').catch(() => {})}>
              <Library className="h-4 w-4" aria-hidden="true" /> Borrow on Open Library
            </a>
          )}
          <FavoriteButton book={book} variant="button" />
          <LibraryStatusMenu book={book} status={status} onChange={setStatus} />
          {links.source_url && (
            <a href={links.source_url} target="_blank" rel="noopener noreferrer" className="btn-ghost">
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open Library
            </a>
          )}
        </div>

        <div className="card mt-6 flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Your rating</p>
            <p className="text-xs text-fg-muted">{myRating ? 'Click a star to update your rating.' : 'Rate this book to improve your recommendations.'}</p>
          </div>
          <div className="flex items-center gap-3">
            <RatingStars value={myRating} onChange={(v) => setRating(book, v)} size="lg" label={`Rate ${book.title}`} />
            {myRating > 0 && (
              <button type="button" onClick={() => setRating(book, 0)} className="text-xs font-medium text-fg-subtle hover:text-danger">
                Clear
              </button>
            )}
          </div>
        </div>

        <section className="mt-8" aria-labelledby="about-book">
          <h2 id="about-book" className="section-title">About this book</h2>
          {book.description ? (
            <>
              <p className={`mt-3 whitespace-pre-line text-sm leading-relaxed text-fg-muted sm:text-base ${!expanded && longDescription ? 'line-clamp-[8]' : ''}`}>{book.description}</p>
              {longDescription && (
                <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-2 text-sm font-medium text-brand hover:text-brand-cyan">
                  {expanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-fg-subtle">No description is available for this book.</p>
          )}
        </section>

        <dl className="card mt-8 grid grid-cols-2 gap-5 p-5 sm:grid-cols-3">
          <Meta label="First published" value={book.year} />
          <Meta label="Publisher" value={book.publisher} />
          <Meta label="Language" value={languageName(book.language)} />
          <Meta label="Pages" value={book.pages} />
          <Meta label="ISBN" value={book.isbn} />
          <Meta label="Source" value={book.source === 'openlibrary' ? 'Open Library' : 'SmartLib'} />
        </dl>

        {book.subjects.length > 0 && (
          <section className="mt-8" aria-labelledby="book-subjects">
            <h2 id="book-subjects" className="section-title">Categories</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {book.subjects.map((s) => (
                <li key={s}>
                  <Link to={`/search?q=${encodeURIComponent(s)}&field=subject`} className="chip">
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}
