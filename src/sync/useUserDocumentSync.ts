import { useCallback, useEffect, useRef, useState } from 'react';
import type { BulletNode, PersistedState, Settings } from '../state/types';
import { isSupabaseConfigured } from '../lib/supabase';
import { fetchUserDocument, persistUserDocument } from './userDocumentApi';
import { SAVE_DEBOUNCE_MS, type SyncConnectionStatus } from './syncTypes';

type UseUserDocumentSyncOptions = {
  tree: BulletNode[];
  zoomPath: string[];
  settings: Settings;
  enabled: boolean;
  onHydrate: (payload: PersistedState) => void;
  onFirstVisit: () => PersistedState | null;
};

function isEmptyDocument(doc: { tree: BulletNode[] } | null): boolean {
  if (!doc) return true;
  return !Array.isArray(doc.tree) || doc.tree.length === 0;
}

export function useUserDocumentSync({
  tree,
  zoomPath,
  settings,
  enabled,
  onHydrate,
  onFirstVisit,
}: UseUserDocumentSyncOptions) {
  const [status, setStatus] = useState<SyncConnectionStatus>(enabled ? 'loading' : 'idle');
  const [hydrated, setHydrated] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const treeRef = useRef(tree);
  const zoomPathRef = useRef(zoomPath);
  const settingsRef = useRef(settings);
  const onHydrateRef = useRef(onHydrate);
  const onFirstVisitRef = useRef(onFirstVisit);
  treeRef.current = tree;
  zoomPathRef.current = zoomPath;
  settingsRef.current = settings;
  onHydrateRef.current = onHydrate;
  onFirstVisitRef.current = onFirstVisit;

  const flushSave = useCallback(() => {
    if (!enabled || !isSupabaseConfigured()) return;
    void persistUserDocument({
      tree: treeRef.current,
      zoomPath: zoomPathRef.current,
      settings: settingsRef.current,
    }).catch(() => {
      setStatus('error');
    });
  }, [enabled]);

  const flushSaveRef = useRef(flushSave);
  flushSaveRef.current = flushSave;

  const scheduleSave = useCallback(() => {
    if (!enabled || !hydrated) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      flushSave();
    }, SAVE_DEBOUNCE_MS);
  }, [enabled, flushSave, hydrated]);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured()) return;

    let cancelled = false;
    setStatus('loading');
    setHydrated(false);

    void (async () => {
      try {
        const doc = await fetchUserDocument();
        if (cancelled) return;

        if (isEmptyDocument(doc)) {
          const initial = onFirstVisitRef.current();
          if (initial) {
            onHydrateRef.current(initial);
            await persistUserDocument(initial);
          } else {
            onHydrateRef.current({
              tree: [],
              zoomPath: [],
              settings: { hideCompleted: false, theme: 'light' },
            });
          }
          setHydrated(true);
          setStatus('connected');
          return;
        }

        onHydrateRef.current({
          tree: doc!.tree,
          zoomPath: doc!.zoom_path ?? [],
          settings: doc!.settings ?? { hideCompleted: false, theme: 'light' },
        });
        setHydrated(true);
        setStatus('connected');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !hydrated) return;
    scheduleSave();
  }, [enabled, hydrated, scheduleSave, tree, zoomPath, settings]);

  useEffect(() => {
    if (!enabled) return;
    const onBeforeUnload = () => flushSaveRef.current();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [enabled]);

  return { status, hydrated, flushSave };
}
