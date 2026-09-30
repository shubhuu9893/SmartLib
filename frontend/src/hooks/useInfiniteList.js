import { useCallback, useEffect, useRef, useState } from 'react';
import { isAbort } from '../api/client';

export default function useInfiniteList(fetchPage, deps = [], { enabled = true } = {}) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const generation = useRef(0);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const loadingRef = useRef(false);

  const load = useCallback(async (nextPage, reset) => {
    const gen = generation.current;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRef.current(nextPage);
      if (gen !== generation.current) return;
      setItems((prev) => {
        const merged = reset ? result.items : [...prev, ...result.items];
        const seen = new Set();
        return merged.filter((item) => (seen.has(item.id) ? false : seen.add(item.id)));
      });
      setTotal(result.total ?? 0);
      setHasMore(Boolean(result.hasMore) && result.items.length > 0);
      setPage(nextPage);
    } catch (err) {
      if (!isAbort(err) && gen === generation.current) setError(err);
    } finally {
      if (gen === generation.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    generation.current += 1;
    setItems([]);
    setPage(0);
    setHasMore(false);
    if (enabled) load(1, true);
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  const loadMore = useCallback(() => {
    if (!loadingRef.current && hasMore) load(page + 1, false);
  }, [hasMore, load, page]);

  const reload = useCallback(() => {
    generation.current += 1;
    load(1, true);
  }, [load]);

  return { items, total, hasMore, loading, error, loadMore, reload, page };
}
