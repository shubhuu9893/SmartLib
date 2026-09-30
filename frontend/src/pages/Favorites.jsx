import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Heart, HeartOff } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import BookGrid from '../components/books/BookGrid';
import { SkeletonGrid } from '../components/common/Skeletons';
import { EmptyState, ErrorState } from '../components/common/States';
import useAsync from '../hooks/useAsync';
import { getFavorites } from '../api/favoritesApi';
import { useApp } from '../context/AppContext';

export default function Favorites() {
  const { isFavorite, toggleFavorite, favoriteCount } = useApp();
  const favorites = useAsync(getFavorites, []);
  const { setData } = favorites;

  useEffect(() => {
    setData((list) => (list ? list.filter((b) => isFavorite(b.id)) : list));
  }, [favoriteCount, isFavorite, setData]);

  const items = favorites.data || [];

  return (
    <div>
      <PageHeader title="Favorites" subtitle={items.length ? `${items.length} saved book${items.length === 1 ? '' : 's'}` : 'Books you love, all in one place'} icon={Heart} />
      {favorites.loading && <SkeletonGrid />}
      {favorites.error && <ErrorState error={favorites.error} message="We couldn't load your favorites." onRetry={favorites.reload} />}
      {!favorites.loading && !favorites.error && !items.length && (
        <EmptyState icon={Heart} title="No favorites yet." message="Explore books and save your favorites." actionLabel="Explore Books" actionTo="/explore" />
      )}
      {!favorites.loading && items.length > 0 && (
        <BookGrid
          books={items}
          renderFooter={(book) => (
            <div className="mt-2 flex gap-1.5">
              <Link to={`/book/${encodeURIComponent(book.id)}`} className="btn-secondary flex-1 px-2 py-1.5 text-xs">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Open
              </Link>
              <button type="button" onClick={() => toggleFavorite(book)} className="btn-ghost px-2 py-1.5 text-xs hover:text-danger" aria-label={`Remove ${book.title} from favorites`}>
                <HeartOff className="h-3.5 w-3.5" aria-hidden="true" /> Remove
              </button>
            </div>
          )}
        />
      )}
    </div>
  );
}
