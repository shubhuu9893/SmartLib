import { SearchX } from 'lucide-react';
import BookGrid from '../books/BookGrid';
import LoadMoreTrigger from '../common/LoadMoreTrigger';
import { SkeletonGrid } from '../common/Skeletons';
import { EmptyState, ErrorState } from '../common/States';

export default function SearchResults({ query, items, total, loading, error, hasMore, loadMore, reload }) {
  if (!query) {
    return <EmptyState icon={SearchX} title="Search the SmartLib catalog" message="Find books by title, author, subject, ISBN, category or keyword." />;
  }
  if (loading && !items.length) return <SkeletonGrid />;
  if (error && !items.length) return <ErrorState error={error} message={error.message || "We couldn't complete your search."} onRetry={reload} />;
  if (!items.length) {
    return <EmptyState icon={SearchX} title={`No results for “${query}”`} message="Try different keywords, check the spelling or search a different field." />;
  }
  return (
    <div>
      <p className="mb-4 text-sm text-fg-muted" aria-live="polite">
        {total.toLocaleString()} result{total === 1 ? '' : 's'} for <span className="font-medium text-fg">“{query}”</span>
      </p>
      <BookGrid books={items} />
      {error && <ErrorState compact error={error} onRetry={loadMore} />}
      {!error && <LoadMoreTrigger onLoadMore={loadMore} hasMore={hasMore} loading={loading} />}
    </div>
  );
}
