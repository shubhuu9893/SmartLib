import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ExternalLink } from 'lucide-react';
import Avatar from '../components/common/Avatar';
import BookGrid from '../components/books/BookGrid';
import BookRow from '../components/books/BookRow';
import { SkeletonGrid } from '../components/common/Skeletons';
import { EmptyState, ErrorState } from '../components/common/States';
import useAsync from '../hooks/useAsync';
import { getAuthor, searchBooks } from '../api/booksApi';

export default function AuthorDetails() {
  const { id } = useParams();
  const [page, setPage] = useState(1);
  const detail = useAsync(() => getAuthor(id, { page, limit: 24 }), [id, page]);
  const author = detail.data?.author;
  const works = detail.data?.works;
  const topSubject = author?.topSubjects?.[0];
  const related = useAsync(
    () => searchBooks({ q: topSubject, field: 'subject', limit: 20 }),
    [topSubject],
    { enabled: Boolean(topSubject) },
  );
  const relatedBooks = (related.data?.items || []).filter((b) => !b.authors.some((a) => a.id === id));
  const [bioOpen, setBioOpen] = useState(false);

  if (detail.loading && !detail.data) {
    return (
      <div className="space-y-8" role="status" aria-label="Loading author">
        <div className="flex items-center gap-6">
          <div className="skeleton h-28 w-28 rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="skeleton h-8 w-64" />
            <div className="skeleton h-4 w-40" />
          </div>
        </div>
        <SkeletonGrid />
      </div>
    );
  }

  if (detail.error && !detail.data) {
    return (
      <ErrorState
        error={detail.error}
        title={detail.error.status === 404 ? 'Author not found.' : 'Something went wrong.'}
        onRetry={detail.error.status === 404 ? undefined : detail.reload}
      />
    );
  }

  if (!author) return null;
  const lifespan = [author.birthDate, author.deathDate].filter(Boolean).join(' – ');
  const longBio = (author.bio || '').length > 500;

  return (
    <div className="space-y-12">
      <div>
        <Link to="/authors" className="mb-6 inline-flex items-center gap-1.5 rounded text-sm font-medium text-fg-muted hover:text-fg">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Authors
        </Link>
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <Avatar src={author.photoUrl} name={author.name} size="xl" className="!h-28 !w-28" />
          <div className="min-w-0 flex-1">
            <h1 className="page-title">{author.name}</h1>
            {lifespan && <p className="mt-1 text-sm text-fg-muted">{lifespan}</p>}
            {works?.total > 0 && <p className="mt-1 text-sm text-fg-subtle">{works.total.toLocaleString()} works on Open Library</p>}
            {author.topSubjects.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {author.topSubjects.slice(0, 6).map((s) => (
                  <li key={s}>
                    <Link to={`/search?q=${encodeURIComponent(s)}&field=subject`} className="chip text-xs">{s}</Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={`https://openlibrary.org/authors/${author.id}`} target="_blank" rel="noopener noreferrer" className="btn-ghost px-3 py-1.5 text-xs">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Open Library
              </a>
              {author.wikipedia && (
                <a href={author.wikipedia} target="_blank" rel="noopener noreferrer" className="btn-ghost px-3 py-1.5 text-xs">
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Wikipedia
                </a>
              )}
              {author.links.slice(0, 3).map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="btn-ghost px-3 py-1.5 text-xs">
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> {l.title || 'Website'}
                </a>
              ))}
            </div>
          </div>
        </header>
      </div>

      <section aria-labelledby="author-bio">
        <h2 id="author-bio" className="section-title">Biography</h2>
        {author.bio ? (
          <>
            <p className={`mt-3 max-w-4xl whitespace-pre-line text-sm leading-relaxed text-fg-muted sm:text-base ${longBio && !bioOpen ? 'line-clamp-[6]' : ''}`}>{author.bio}</p>
            {longBio && (
              <button type="button" onClick={() => setBioOpen((v) => !v)} className="mt-2 text-sm font-medium text-brand hover:text-brand-cyan">
                {bioOpen ? 'Show less' : 'Read more'}
              </button>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-fg-subtle">No biography is available for this author.</p>
        )}
      </section>

      <section aria-labelledby="author-books">
        <h2 id="author-books" className="section-title mb-4">Books</h2>
        {detail.loading ? (
          <SkeletonGrid />
        ) : works?.items.length ? (
          <>
            <BookGrid books={works.items} />
            {(page > 1 || works.hasMore) && (
              <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Author books pagination">
                <button type="button" className="btn-secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                <span className="text-sm text-fg-muted">Page {page}</span>
                <button type="button" className="btn-secondary" disabled={!works.hasMore} onClick={() => setPage((p) => p + 1)}>Next</button>
              </nav>
            )}
          </>
        ) : (
          <EmptyState compact icon={BookOpen} title="No books found for this author." />
        )}
      </section>

      {topSubject && (
        <BookRow
          title="Related Books"
          subtitle={`More in ${topSubject}`}
          books={relatedBooks}
          loading={related.loading}
          error={related.error}
          onRetry={related.reload}
        />
      )}
    </div>
  );
}
