import { BookOpen, Sparkles } from 'lucide-react';
import Greeting from '../components/dashboard/Greeting';
import CategorySection from '../components/dashboard/CategorySection';
import AuthorsSection from '../components/dashboard/AuthorsSection';
import BookRow from '../components/books/BookRow';
import useAsync from '../hooks/useAsync';
import useRecommendations from '../hooks/useRecommendations';
import { getCategories, getPopular, getRecentlyAdded, getTrending } from '../api/booksApi';
import { getLibrary } from '../api/libraryApi';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { profile, firebaseUser } = useAuth();
  const reading = useAsync(() => getLibrary('reading'), [profile?.id], { enabled: Boolean(profile?.id) });
  const recs = useRecommendations();
  const popular = useAsync(() => getPopular({ limit: 20 }), []);
  const trending = useAsync(() => getTrending({ limit: 20 }), []);
  const recent = useAsync(() => getRecentlyAdded({ limit: 20 }), []);
  const categories = useAsync(getCategories, []);

  const continueBooks = (reading.data || []).map((entry) => entry.book);
  const because = (recs.data?.because || []).filter((g) => g.seed && g.items.length);

  return (
    <div className="space-y-10">
      <Greeting name={profile?.name || firebaseUser?.displayName} />

      <BookRow
        title="Continue Reading"
        books={continueBooks}
        loading={reading.loading}
        error={reading.error}
        onRetry={reading.reload}
        to="/library"
        empty={{
          icon: BookOpen,
          title: 'No reading history yet.',
          message: 'Start exploring books to build your personalized library.',
          actionLabel: 'Explore Books',
          actionTo: '/explore',
        }}
      />

      <BookRow
        title="Recommended For You"
        subtitle={recs.data?.hasSignals ? 'Based on your interests, favorites, ratings and reading' : undefined}
        books={recs.data?.items?.slice(0, 20)}
        loading={recs.loading}
        error={recs.error}
        onRetry={recs.reload}
        to="/recommended"
        badge="Recommended"
        showReason
        empty={{
          icon: Sparkles,
          title: 'No recommendations yet.',
          message: 'Add interests, favorite or rate a few books and we will tailor suggestions for you.',
          actionLabel: 'Choose Interests',
          actionTo: '/interests',
        }}
      />

      {because.slice(0, 2).map((group) => (
        <BookRow key={group.seed.id} title={`Because You Like ${group.seed.title}`} books={group.items} />
      ))}

      <BookRow
        title="Popular Books"
        books={popular.data?.items}
        loading={popular.loading}
        error={popular.error}
        onRetry={popular.reload}
        to="/explore?tab=popular"
        badge="Popular"
      />

      <BookRow
        title="Trending Now"
        books={trending.data?.items}
        loading={trending.loading}
        error={trending.error}
        onRetry={trending.reload}
        to="/explore?tab=trending"
        badge="Trending"
      />

      <CategorySection categories={categories.data || []} loading={categories.loading} error={categories.error} onRetry={categories.reload} />

      <AuthorsSection authors={recs.data?.authors} loading={recs.loading} />

      <BookRow
        title="Recently Added"
        subtitle="Newest additions to the SmartLib catalog"
        books={recent.data}
        loading={recent.loading}
        error={recent.error}
        onRetry={recent.reload}
        badge="New"
        empty={{ icon: BookOpen, title: 'Nothing added yet.', message: 'Books you and other readers discover will appear here.' }}
      />
    </div>
  );
}
