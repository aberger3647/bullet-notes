import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { listMyShares, revokeShare, setSharePermission, type ShareMeta } from './sharesApi';

export function useMySharesList(enabled: boolean) {
  const [shares, setShares] = useState<ShareMeta[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !isSupabaseConfigured()) return;
    try {
      setShares(await listMyShares());
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
        const list = await listMyShares();
        if (!cancelled) {
          setShares(list);
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

  return { shares, loading, error, refresh, togglePermission, revoke };
}
