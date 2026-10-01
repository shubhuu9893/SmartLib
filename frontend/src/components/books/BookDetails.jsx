import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ExternalLink,
  Library,
  Eye,
  Lock,
  CreditCard,
  AlertCircle,
  Info,
  Loader2,
} from 'lucide-react';
import BookCover from './BookCover';
import FavoriteButton from './FavoriteButton';
import RatingStars, { RatingDisplay } from './RatingStars';
import LibraryStatusMenu from './LibraryStatusMenu';
import { useApp } from '../../context/AppContext';
import { languageName } from '../../utils/format';
import { getReaderInfo } from '../../api/readerApi';

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
  public_domain: { label: 'Public Domain', style: 'bg-success/15 text-success' },
  open_access: { label: 'Open Access', style: 'bg-success/15 text-success' },
  borrow: { label: 'Borrowable', style: 'bg-brand/15 text-brand' },
  borrowable: { label: 'Borrowable', style: 'bg-brand/15 text-brand' },
  preview: { label: 'Preview edition', style: 'bg-warning/15 text-warning' },
  printdisabled: { label: 'Print-disabled access', style: 'bg-warning/15 text-warning' },
  paid: { label: 'Purchase Required', style: 'bg-ink-800 text-fg-muted' },
  unavailable: { label: 'Online reading unavailable', style: 'bg-ink-800 text-fg-muted' },
  no_ebook: { label: 'No e-book available', style: 'bg-ink-800 text-fg-muted' },
};

export default function BookDetails({ book }) {
  const navigate = useNavigate();
  const { getRating, setRating } = useApp();
  const [status, setStatus] = useState(book.userState?.library_status || null);
  const [expanded, setExpanded] = useState(false);
  const myRating = getRating(book.id) || book.userState?.rating || 0;
  const links = book.availability || {};
  const longDescription = (book.description || '').length > 600;

  // Reader state
  const [readerInfo, setReaderInfo] = useState(null);
  const [readerLoading, setReaderLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (book.id) {
      setReaderLoading(true);
      getReaderInfo(book.id)
        .then((data) => {
          if (isMounted) setReaderInfo(data);
        })
        .catch(() => {
          // fallback to book availability
        })
        .finally(() => {
          if (isMounted) setReaderLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [book.id]);

  const accessType = readerInfo?.access_type || links.access;
  const access = ACCESS_LABELS[accessType] || ACCESS_LABELS[links.access];

  const handleReadClick = () => {
    navigate(`/reader/${encodeURIComponent(book.id)}`);
  };

  return (
    <article className="grid gap-8 md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] lg:gap-12">
      <div className="mx-auto w-48 sm:w-56 md:mx-0 md:w-full">
        <BookCover
          src={book.coverUrl?.replace('-M.jpg', '-L.jpg')}
          title={book.title}
          author={book.author}
          eager
          className="aspect-[2/3] w-full rounded-2xl shadow-card ring-1 ring-white/5"
        />
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

        {/* Continue Reading Prompt */}
        {readerInfo?.progress > 0 && (
          <div className="card mt-5 flex items-center justify-between border-brand/30 bg-brand/5 p-3.5 sm:p-4">
            <div className="flex items-center gap-2.5">
              <BookOpen className="h-5 w-5 text-brand shrink-0" />
              <div>
                <p className="text-sm font-semibold text-fg">
                  You were reading this book at <strong>{readerInfo.progress}%</strong>
                </p>
                <p className="text-xs text-fg-muted">Page {readerInfo.current_page} of {readerInfo.total_pages}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReadClick}
              className="btn-primary text-xs sm:text-sm px-3.5 py-1.5"
            >
              Continue Reading
            </button>
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {readerLoading ? (
            <button type="button" disabled className="btn-gradient opacity-60">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking availability…
            </button>
          ) : readerInfo?.available ? (
            /* 1. Fully Available or Open Access */
            ['public_domain', 'open_access'].includes(readerInfo.access_type) || !['preview', 'borrow'].includes(readerInfo.access_type) ? (
              <button
                type="button"
                onClick={handleReadClick}
                className="btn-gradient inline-flex items-center gap-2 shadow-lg"
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                {readerInfo.progress > 0 ? 'Continue Reading' : 'Read Book'}
              </button>
            ) : readerInfo.access_type === 'preview' ? (
              /* 2. Preview Only */
              <button
                type="button"
                onClick={handleReadClick}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <Eye className="h-4 w-4" aria-hidden="true" /> Read Preview
              </button>
            ) : (
              /* 3. Borrow Required */
              <button
                type="button"
                onClick={handleReadClick}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Lock className="h-4 w-4" aria-hidden="true" /> Borrow & Read
              </button>
            )
          ) : readerInfo?.access_type === 'paid' ? (
            /* 4. Paid / Commercial Title */
            <button
              type="button"
              disabled
              className="btn-ghost cursor-not-allowed opacity-60 inline-flex items-center gap-2 border border-current/20"
              title="This commercial copyrighted title is restricted by publisher."
            >
              <CreditCard className="h-4 w-4" aria-hidden="true" /> Purchase Required
            </button>
          ) : (
            /* 5. Online Reading Unavailable */
            <button
              type="button"
              disabled
              className="btn-ghost cursor-not-allowed opacity-60 inline-flex items-center gap-2 border border-current/20"
              title="No legitimate readable source is currently available."
            >
              <AlertCircle className="h-4 w-4" aria-hidden="true" /> Online Reading Unavailable
            </button>
          )}

          <FavoriteButton book={book} variant="button" />
          <LibraryStatusMenu book={book} status={status} onChange={setStatus} />

          {links.source_url && (
            <a href={links.source_url} target="_blank" rel="noopener noreferrer" className="btn-ghost">
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open Library
            </a>
          )}
        </div>

        {/* Unavailable info explanation */}
        {!readerLoading && !readerInfo?.available && readerInfo?.message && (
          <p className="mt-2.5 flex items-center gap-1.5 text-xs text-fg-subtle">
            <Info className="h-3.5 w-3.5 text-warning shrink-0" />
            {readerInfo.message}
          </p>
        )}

        {/* User Rating */}
        <div className="card mt-6 flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Your rating</p>
            <p className="text-xs text-fg-muted">
              {myRating ? 'Click a star to update your rating.' : 'Rate this book to improve your recommendations.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <RatingStars value={myRating} onChange={(v) => setRating(book, v)} size="lg" label={`Rate ${book.title}`} />
            {myRating > 0 && (
              <button
                type="button"
                onClick={() => setRating(book, 0)}
                className="text-xs font-medium text-fg-subtle hover:text-danger"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* About Book */}
        <section className="mt-8" aria-labelledby="about-book">
          <h2 id="about-book" className="section-title">About this book</h2>
          {book.description ? (
            <>
              <p className={`mt-3 whitespace-pre-line text-sm leading-relaxed text-fg-muted sm:text-base ${!expanded && longDescription ? 'line-clamp-[8]' : ''}`}>
                {book.description}
              </p>
              {longDescription && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-2 text-sm font-medium text-brand hover:text-brand-cyan"
                >
                  {expanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-fg-subtle">No description is available for this book.</p>
          )}
        </section>

        {/* Metadata Grid */}
        <dl className="card mt-8 grid grid-cols-2 gap-5 p-5 sm:grid-cols-3">
          <Meta label="First published" value={book.year} />
          <Meta label="Publisher" value={book.publisher} />
          <Meta label="Language" value={languageName(book.language)} />
          <Meta label="Pages" value={book.pages} />
          <Meta label="ISBN" value={book.isbn} />
          <Meta label="Source" value={book.source === 'openlibrary' ? 'Open Library' : 'SmartLib'} />
        </dl>

        {/* Categories */}
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
