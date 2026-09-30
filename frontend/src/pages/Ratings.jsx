import { useMemo, useState } from 'react';
import { Star, Trash2 } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import BookListItem from '../components/books/BookListItem';
import RatingStars from '../components/books/RatingStars';
import { SkeletonList } from '../components/common/Skeletons';
import { EmptyState, ErrorState } from '../components/common/States';
import useAsync from '../hooks/useAsync';
import { getRatings } from '../api/ratingsApi';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/format';

const SORTS = [
  { id: 'recent', label: 'Recently rated' },
  { id: 'high', label: 'Highest rating' },
  { id: 'low', label: 'Lowest rating' },
];

export default function Ratings() {
  const { setRating } = useApp();
  const ratings = useAsync(getRatings, []);
  const [sort, setSort] = useState('recent');

  const items = useMemo(() => {
    const list = [...(ratings.data || [])];
    if (sort === 'high') list.sort((a, b) => b.rating - a.rating);
    else if (sort === 'low') list.sort((a, b) => a.rating - b.rating);
    else list.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    return list;
  }, [ratings.data, sort]);

  const update = async (item, value) => {
    const ok = await setRating(item.book, value);
    if (!ok) return;
    if (value) {
      ratings.setData((list) => list.map((r) => (r.book.id === item.book.id ? { ...r, rating: value, updatedAt: new Date().toISOString() } : r)));
    } else {
      ratings.setData((list) => list.filter((r) => r.book.id !== item.book.id));
    }
  };

  const average = items.length ? (items.reduce((s, r) => s + r.rating, 0) / items.length).toFixed(1) : null;

  return (
    <div>
      <PageHeader
        title="My Ratings"
        subtitle={average ? `${items.length} rated · average ${average} ★` : 'Rate books to improve your recommendations'}
        icon={Star}
        actions={
          items.length > 1 && (
            <label className="flex items-center gap-2 text-sm text-fg-muted">
              <span>Sort</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="input w-auto py-2">
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>
          )
        }
      />
      {ratings.loading && <SkeletonList />}
      {ratings.error && <ErrorState error={ratings.error} message="We couldn't load your ratings." onRetry={ratings.reload} />}
      {!ratings.loading && !ratings.error && !items.length && (
        <EmptyState icon={Star} title="No ratings yet." message="Rate books to improve your recommendations." actionLabel="Explore Books" actionTo="/explore" />
      )}
      {!ratings.loading && items.length > 0 && (
        <div className="grid gap-3 xl:grid-cols-2">
          {items.map((item) => (
            <BookListItem key={item.book.id} book={item.book} meta={`Rated ${formatDate(item.updatedAt || item.createdAt)}`}>
              <div className="flex flex-wrap items-center gap-3">
                <RatingStars value={item.rating} onChange={(v) => update(item, v)} label={`Your rating for ${item.book.title}`} />
                <button type="button" onClick={() => update(item, 0)} className="btn-ghost px-2.5 py-1.5 text-xs hover:text-danger" aria-label={`Delete rating for ${item.book.title}`}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                </button>
              </div>
            </BookListItem>
          ))}
        </div>
      )}
    </div>
  );
}
