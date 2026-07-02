import { useCallback, useEffect, useState } from 'react';
import type { PersistedState } from '../state/types';
import { isSupabaseConfigured } from '../lib/supabase';
import { createDoc, deleteDoc, listDocs, type DocMeta } from './multiDocumentApi';

export function useDocumentsList(enabled: boolean) {
  const [documents, setDocuments] = useState<DocMeta[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !isSupabaseConfigured()) return;
    try {
      const docs = await listDocs();
      setDocuments(docs);
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
        const docs = await listDocs();
        if (cancelled) return;
        setDocuments(docs);
        setError(false);
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

  const createDocument = useCallback(
    async (title: string, payload: PersistedState) => {
      const id = await createDoc(title, payload);
      await refresh();
      return id;
    },
    [refresh],
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      await deleteDoc(id);
      await refresh();
    },
    [refresh],
  );

  return { documents, loading, error, refresh, createDocument, deleteDocument };
}
