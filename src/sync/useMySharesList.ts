import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { listMyShares, revokeShare, setSharePermission, type ShareMeta } from './sharesApi';

export function useMySharesList(enabled: boolean) {
  const [shares, setShares] = useState<ShareMeta[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !isSupabaseConfigured()) return;
    try {
      const { shares: page, hasMore: more } = await listMyShares(0);
      setShares(page);
      setHasMore(more);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured()) return;
    let cancelled = false;
    void (async () => {
      try {
        const { shares: page, hasMore: more } = await listMyShares(0);
        if (!cancelled) {
          setShares(page);
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
      const { shares: page, hasMore: more } = await listMyShares(shares.length);
      setShares((prev) => [...prev, ...page]);
      setHasMore(more);
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [enabled, loadingMore, hasMore, shares.length]);

  const togglePermission = useCallback(
    async (shareToken: string, next: 'edit' | 'view') => {
      await setSharePermission(shareToken, next);
      await refresh();
    },
    [refresh],
  );

  const revoke = useCallback(
    async (shareToken: string) => {
      await revokeShare(shareToken);
      await refresh();
    },
    [refresh],
  );

  return { shares, loading, loadingMore, hasMore, error, refresh, loadMore, togglePermission, revoke };
}
