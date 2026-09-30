import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { addFavorite, getFavoriteIds, removeFavorite } from '../api/favoritesApi';
import { deleteRating, getRatings, rateBook } from '../api/ratingsApi';
import { getNotifications } from '../api/notificationsApi';
import { getRecommendations } from '../api/recommendationApi';

const AppContext = createContext(null);

const RECS_TTL = 5 * 60 * 1000;

export function AppProvider({ children }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const [ratings, setRatings] = useState(() => new Map());
  const [unreadCount, setUnreadCount] = useState(0);
  const recsCache = useRef({ data: null, at: 0, promise: null, stale: false });
  const [recsVersion, setRecsVersion] = useState(0);
  const userId = profile?.id;

  const invalidateRecommendations = useCallback(() => {
    recsCache.current.stale = true;
    setRecsVersion((v) => v + 1);
  }, []);

  const refreshUnread = useCallback(async () => {
    try {
      const { unread } = await getNotifications();
      setUnreadCount(unread);
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setFavoriteIds(new Set());
      setRatings(new Map());
      setUnreadCount(0);
      recsCache.current = { data: null, at: 0, promise: null, stale: false };
      return;
    }
    getFavoriteIds()
      .then((ids) => setFavoriteIds(new Set(ids)))
      .catch(() => {});
    getRatings()
      .then((list) => setRatings(new Map(list.map((r) => [r.book.id, r.rating]))))
      .catch(() => {});
    refreshUnread();
  }, [userId, refreshUnread]);

  const loadRecommendations = useCallback(async ({ force = false } = {}) => {
    const cache = recsCache.current;
    const fresh = cache.data && !cache.stale && Date.now() - cache.at < RECS_TTL;
    if (!force && fresh) return cache.data;
    if (!force && cache.promise) return cache.promise;
    const promise = getRecommendations({ limit: 30 })
      .then((data) => {
        recsCache.current = { data, at: Date.now(), promise: null, stale: false };
        return data;
      })
      .catch((error) => {
        recsCache.current.promise = null;
        throw error;
      });
    recsCache.current.promise = promise;
    return promise;
  }, []);

  const isFavorite = useCallback((id) => favoriteIds.has(String(id)), [favoriteIds]);

  const toggleFavorite = useCallback(
    async (book) => {
      const id = String(book.id);
      const wasFavorite = favoriteIds.has(id);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.delete(id);
        else next.add(id);
        return next;
      });
      try {
        if (wasFavorite) await removeFavorite(id);
        else await addFavorite(id);
        toast(wasFavorite ? 'Removed from favorites' : 'Added to favorites');
        invalidateRecommendations();
        return !wasFavorite;
      } catch (error) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasFavorite) next.add(id);
          else next.delete(id);
          return next;
        });
        toast(error.message || "Couldn't update favorites", 'error');
        return wasFavorite;
      }
    },
    [favoriteIds, toast, invalidateRecommendations],
  );

  const getRating = useCallback((id) => ratings.get(String(id)) || 0, [ratings]);

  const setRating = useCallback(
    async (book, value) => {
      const id = String(book.id);
      const previous = ratings.get(id);
      setRatings((prev) => {
        const next = new Map(prev);
        if (value) next.set(id, value);
        else next.delete(id);
        return next;
      });
      try {
        if (value) await rateBook(id, value);
        else await deleteRating(id);
        toast(value ? `Rated ${value} star${value > 1 ? 's' : ''}` : 'Rating removed');
        invalidateRecommendations();
        return true;
      } catch (error) {
        setRatings((prev) => {
          const next = new Map(prev);
          if (previous) next.set(id, previous);
          else next.delete(id);
          return next;
        });
        toast(error.message || "Couldn't save your rating", 'error');
        return false;
      }
    },
    [ratings, toast, invalidateRecommendations],
  );

  const value = useMemo(
    () => ({
      isFavorite,
      toggleFavorite,
      favoriteCount: favoriteIds.size,
      getRating,
      setRating,
      unreadCount,
      setUnreadCount,
      refreshUnread,
      loadRecommendations,
      invalidateRecommendations,
      recsVersion,
    }),
    [isFavorite, toggleFavorite, favoriteIds.size, getRating, setRating, unreadCount, refreshUnread, loadRecommendations, invalidateRecommendations, recsVersion],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
