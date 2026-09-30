import { RefreshCw, Sparkles } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import BookGrid from '../components/books/BookGrid';
import BookRow from '../components/books/BookRow';
import AuthorsSection from '../components/dashboard/AuthorsSection';
import { SkeletonGrid } from '../components/common/Skeletons';
import { EmptyState, ErrorState } from '../components/common/States';
import useRecommendations from '../hooks/useRecommendations';

export default function Recommended() {
  const recs = useRecommendations();
  const data = recs.data;

  return (
    <div>
      <PageHeader
        title="Recommended For You"
        subtitle="Ranked with TF-IDF + cosine similarity over your interests, favorites, ratings, library, reading and search history"
        icon={Sparkles}
        actions={
          <button type="button" onClick={recs.reload} disabled={recs.loading} className="btn-secondary">
            <RefreshCw className={`h-4 w-4 ${recs.loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
          </button>
        }
      />
      {recs.loading && !data && <SkeletonGrid />}
      {recs.error && <ErrorState error={recs.error} message={recs.error.message || "We couldn't load your recommendations."} onRetry={recs.reload} />}
      {data && !recs.error && !data.items.length && (
        <EmptyState
          icon={Sparkles}
          title={data.hasSignals ? 'Still learning your taste.' : 'No recommendations yet.'}
          message={
            data.hasSignals
              ? 'We could not find close matches yet. Rate or favorite a few more books to refine your picks.'
              : 'Choose your interests, favorite or rate some books, and your personalised picks will appear here.'
          }
          actionLabel={data.hasSignals ? 'Explore Books' : 'Choose Interests'}
          actionTo={data.hasSignals ? '/explore' : '/interests'}
        />
      )}
      {data && data.items.length > 0 && (
        <div className="space-y-12">
          <BookGrid books={data.items} showReason />
          {data.because
            .filter((g) => g.seed && g.items.length)
            .map((group) => (
              <BookRow key={group.seed.id} title={`Because You Like ${group.seed.title}`} books={group.items} />
            ))}
          <AuthorsSection authors={data.authors} />
        </div>
      )}
    </div>
  );
}
