import { useSearchParams } from 'react-router-dom';
import { Compass, Sparkles } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import BookGrid from '../components/books/BookGrid';
import BookRow from '../components/books/BookRow';
import CategorySection from '../components/dashboard/CategorySection';
import AuthorsSection from '../components/dashboard/AuthorsSection';
import LoadMoreTrigger from '../components/common/LoadMoreTrigger';
import { SkeletonGrid } from '../components/common/Skeletons';
import { EmptyState, ErrorState } from '../components/common/States';
import useAsync from '../hooks/useAsync';
import useInfiniteList from '../hooks/useInfiniteList';
import useRecommendations from '../hooks/useRecommendations';
import { getCategories, getNewBooks, getPopular, getTrending } from '../api/booksApi';

const TABS = [
  { id: 'all', label: 'Overview' },
  { id: 'popular', label: 'Popular', fetch: (page) => getPopular({ page, limit: 24 }), badge: 'Popular' },
  { id: 'trending', label: 'Trending', fetch: (page) => getTrending({ page, limit: 24 }), badge: 'Trending' },
  { id: 'new', label: 'New Books', fetch: (page) => getNewBooks({ page, limit: 24 }), badge: 'New' },
  { id: 'recommended', label: 'Recommended' },
];

function PagedTab({ tab }) {
  const list = useInfiniteList(tab.fetch, [tab.id]);
  if (list.loading && !list.items.length) return <SkeletonGrid />;
  if (list.error && !list.items.length) return <ErrorState error={list.error} onRetry={list.reload} />;
  if (!list.items.length) return <EmptyState icon={Compass} title="No books found" message="Please try again later." />;
  return (
    <>
      <BookGrid books={list.items} badge={tab.badge} />
      <LoadMoreTrigger onLoadMore={list.loadMore} hasMore={list.hasMore} loading={list.loading} />
    </>
  );
}

function RecommendedTab({ recs }) {
  if (recs.loading && !recs.data) return <SkeletonGrid />;
  if (recs.error) return <ErrorState error={recs.error} onRetry={recs.reload} />;
  if (!recs.data?.items.length) {
    return <EmptyState icon={Sparkles} title="No recommendations yet." message="Add interests or rate books to get personalised picks." actionLabel="Choose Interests" actionTo="/interests" />;
  }
  return <BookGrid books={recs.data.items} badge="Recommended" showReason />;
}

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const tabId = params.get('tab') || 'all';
  const tab = TABS.find((t) => t.id === tabId) || TABS[0];
  const recs = useRecommendations();
  const overview = tab.id === 'all';
  const popular = useAsync(() => getPopular({ limit: 20 }), [], { enabled: overview });
  const trending = useAsync(() => getTrending({ limit: 20 }), [], { enabled: overview });
  const fresh = useAsync(() => getNewBooks({ limit: 20 }), [], { enabled: overview });
  const categories = useAsync(getCategories, [], { enabled: overview });

  return (
    <div>
      <PageHeader title="Explore" subtitle="Discover popular, trending and new books" icon={Compass} />
      <div className="scrollbar-none -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Explore filters">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === tab.id}
            onClick={() => setParams(t.id === 'all' ? {} : { tab: t.id }, { replace: true })}
            className={`chip shrink-0 ${t.id === tab.id ? 'chip-active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {overview && (
          <div className="space-y-10">
            <BookRow title="Popular" books={popular.data?.items} loading={popular.loading} error={popular.error} onRetry={popular.reload} badge="Popular" to="/explore?tab=popular" />
            <BookRow title="Trending" books={trending.data?.items} loading={trending.loading} error={trending.error} onRetry={trending.reload} badge="Trending" to="/explore?tab=trending" />
            <BookRow title="New Books" books={fresh.data?.items} loading={fresh.loading} error={fresh.error} onRetry={fresh.reload} badge="New" to="/explore?tab=new" />
            <BookRow
              title="Recommended"
              books={recs.data?.items}
              loading={recs.loading}
              error={recs.error}
              onRetry={recs.reload}
              badge="Recommended"
              to="/recommended"
              empty={{ icon: Sparkles, title: 'No recommendations yet.', message: 'Add interests or rate books to get personalised picks.', actionLabel: 'Choose Interests', actionTo: '/interests' }}
            />
            <CategorySection categories={categories.data || []} loading={categories.loading} error={categories.error} onRetry={categories.reload} />
            <AuthorsSection authors={recs.data?.authors} loading={recs.loading} title="Authors" />
          </div>
        )}
        {tab.fetch && <PagedTab key={tab.id} tab={tab} />}
        {tab.id === 'recommended' && <RecommendedTab recs={recs} />}
      </div>
    </div>
  );
}
