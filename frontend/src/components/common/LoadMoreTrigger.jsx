import { useEffect, useRef } from 'react';
import { Spinner } from './States';

export default function LoadMoreTrigger({ onLoadMore, hasMore, loading }) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !hasMore) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore();
      },
      { rootMargin: '400px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore]);

  if (!hasMore && !loading) return null;

  return (
    <div ref={ref} className="flex justify-center py-8">
      {loading ? (
        <Spinner className="h-6 w-6" label="Loading more books" />
      ) : (
        <button type="button" onClick={onLoadMore} className="btn-secondary">
          Load more
        </button>
      )}
    </div>
  );
}
