import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, UserSearch, Users } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Avatar from '../components/common/Avatar';
import AuthorsSection from '../components/dashboard/AuthorsSection';
import { EmptyState, ErrorState } from '../components/common/States';
import useDebounce from '../hooks/useDebounce';
import useAsync from '../hooks/useAsync';
import useRecommendations from '../hooks/useRecommendations';
import { searchAuthors } from '../api/booksApi';

export default function Authors() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [input, setInput] = useState(q);
  const debounced = useDebounce(input.trim(), 400);
  const recs = useRecommendations();

  useEffect(() => {
    if (debounced !== q) setParams(debounced ? { q: debounced } : {}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const results = useAsync(() => searchAuthors({ q, limit: 24 }), [q], { enabled: q.length >= 2 });

  return (
    <div>
      <PageHeader title="Authors" subtitle="Find authors and explore their books" icon={Users} />
      <form role="search" onSubmit={(e) => e.preventDefault()} className="relative mb-8">
        <label htmlFor="author-search" className="sr-only">Search authors</label>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
        <input id="author-search" type="search" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search authors by name…" className="input h-12 pl-12 text-base" />
      </form>

      {q.length < 2 && (
        <div className="space-y-10">
          <AuthorsSection authors={recs.data?.authors} loading={recs.loading} title="Authors You May Like" />
          {!recs.loading && !recs.data?.authors?.length && (
            <EmptyState icon={UserSearch} title="Search for an author" message="Type a name above. Favorite and rate books to get author suggestions." />
          )}
        </div>
      )}

      {q.length >= 2 && (
        <>
          {results.loading && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
            </div>
          )}
          {results.error && <ErrorState error={results.error} onRetry={results.reload} />}
          {!results.loading && !results.error && !results.data?.items.length && (
            <EmptyState icon={UserSearch} title={`No authors found for “${q}”`} message="Try a different spelling or a shorter name." />
          )}
          {!results.loading && results.data?.items.length > 0 && (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.data.items.map((author) => (
                <li key={author.id}>
                  <Link to={`/author/${author.id}`} className="card flex items-center gap-4 p-4 transition-colors hover:border-brand/40">
                    <Avatar src={author.photoUrl} name={author.name} size="lg" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-fg">{author.name}</p>
                      {author.topWork && <p className="truncate text-sm text-fg-muted">Known for {author.topWork}</p>}
                      {author.workCount != null && <p className="text-xs text-fg-subtle">{author.workCount.toLocaleString()} works</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
