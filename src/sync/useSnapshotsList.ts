import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { listSnapshots, restoreSnapshot, type RestoredDocument, type SnapshotMeta } from './snapshotApi';

export function useSnapshotsList(enabled: boolean) {
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [loading, setLoading] = useState(enabled);

  const refresh = useCallback(async () => {
    if (!enabled || !isSupabaseConfigured()) return;
    try {
      setSnapshots(await listSnapshots());
    } catch {
      /* best-effort; keep the previous list */
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured()) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await listSnapshots();
        if (!cancelled) setSnapshots(list);
      } catch {
        /* best-effort; keep the previous list */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const restore = useCallback(async (id: string): Promise<RestoredDocument | null> => {
    return restoreSnapshot(id);
  }, []);

  return { snapshots, loading, refresh, restore };
}
