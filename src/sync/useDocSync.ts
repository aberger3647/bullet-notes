import { useCallback, useEffect, useRef, useState } from 'react';
import type { BulletNode, PersistedState, Settings } from '../state/types';
import { deriveDocTitle } from '../state/treeOps';
import { isSupabaseConfigured } from '../lib/supabase';
import { getDoc, saveDoc } from './multiDocumentApi';
import { SAVE_DEBOUNCE_MS, type SyncConnectionStatus } from './syncTypes';

type UseDocSyncOptions = {
  docId: string;
  tree: BulletNode[];
  zoomPath: string[];
  settings: Settings;
  enabled: boolean;
  onHydrate: (payload: PersistedState) => void;
};

export function useDocSync({ docId, tree, zoomPath, settings, enabled, onHydrate }: UseDocSyncOptions) {
  const [status, setStatus] = useState<SyncConnectionStatus>(enabled ? 'loading' : 'idle');
  const [hydrated, setHydrated] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const treeRef = useRef(tree);
  const zoomPathRef = useRef(zoomPath);
  const settingsRef = useRef(settings);
  const onHydrateRef = useRef(onHydrate);
  useEffect(() => {
    treeRef.current = tree;
    zoomPathRef.current = zoomPath;
    settingsRef.current = settings;
    onHydrateRef.current = onHydrate;
  });

  const [prevKey, setPrevKey] = useState(`${enabled}:${docId}`);
  const key = `${enabled}:${docId}`;
  if (key !== prevKey) {
    setPrevKey(key);
    if (enabled && docId && isSupabaseConfigured()) {
      setStatus('loading');
      setHydrated(false);
    }
  }

  const flushSave = useCallback(() => {
    if (!enabled || !isSupabaseConfigured()) return;
    void saveDoc(docId, deriveDocTitle(treeRef.current), {
      tree: treeRef.current,
      zoomPath: zoomPathRef.current,
      settings: settingsRef.current,
    }).catch(() => {
      setStatus('error');
    });
  }, [enabled, docId]);

  const flushSaveRef = useRef(flushSave);
  useEffect(() => {
    flushSaveRef.current = flushSave;
  });

  const scheduleSave = useCallback(() => {
    if (!enabled || !hydrated) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      flushSave();
    }, SAVE_DEBOUNCE_MS);
  }, [enabled, flushSave, hydrated]);

  useEffect(() => {
    if (!enabled || !docId || !isSupabaseConfigured()) return;

    let cancelled = false;

    void (async () => {
      try {
        const doc = await getDoc(docId);
        if (cancelled) return;
        if (!doc) {
          setStatus('error');
          return;
        }
        onHydrateRef.current({
          tree: doc.tree,
          zoomPath: doc.zoom_path ?? [],
          settings: doc.settings ?? { hideCompleted: false, theme: 'light' },
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
  }, [enabled, docId]);

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
