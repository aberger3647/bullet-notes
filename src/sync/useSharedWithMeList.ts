import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { listSharedWithMe, type SharedWithMeItem } from './sharedWithMeApi';

export function useSharedWithMeList(enabled: boolean) {
  const [items, setItems] = useState<SharedWithMeItem[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured()) return;
    let cancelled = false;
    void (async () => {
      try {
        const { items: page, hasMore: more } = await listSharedWithMe(0);
        if (!cancelled) {
          setItems(page);
          setHasMore(more);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const loadMore = useCallback(async () => {
    if (!enabled || !isSupabaseConfigured() || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const { items: page, hasMore: more } = await listSharedWithMe(items.length);
      setItems((prev) => [...prev, ...page]);
      setHasMore(more);
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [enabled, loadingMore, hasMore, items.length]);

  return { items, loading, loadingMore, hasMore, error, loadMore };
}
