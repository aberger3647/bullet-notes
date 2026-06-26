import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';
import { appReducer, initialAppState } from '../state/reducer';
import type { AppAction, AppState, BulletNode, PersistedState } from '../state/types';
import { getChildrenForZoom, sanitizeZoomPath } from '../state/treeOps';
import { isSupabaseConfigured } from '../lib/supabase';
import { createSharedDocument, useDocumentSync } from '../sync/useDocumentSync';
import type { SyncConnectionStatus } from '../sync/syncTypes';
import { AppStateContext, type AppMode } from './appStateContext';

const STORAGE_KEY = 'bullet-notes:v1';
const DEBOUNCE_MS = 400;

function getVisibleForView(state: AppState) {
  const raw = getChildrenForZoom(state.tree, state.zoomPath);
  if (!state.settings.hideCompleted) return raw;
  return raw.filter((n) => !n.completed);
}

type Props = {
  children: ReactNode;
  mode: AppMode;
  shareToken?: string;
};

export function AppStateProvider({ children, mode, shareToken }: Props) {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const [persistReady, setPersistReady] = useState(mode === 'local');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemoteRef = useRef(false);
  const broadcastRef = useRef<(action: AppAction) => void>(() => {});
  const settingsRef = useRef(state.settings);
  settingsRef.current = state.settings;

  const onHydrate = useCallback((tree: BulletNode[]) => {
    dispatch({
      type: 'HYDRATE',
      payload: {
        tree,
        zoomPath: [],
        settings: settingsRef.current,
      },
    });
    setPersistReady(true);
  }, []);

  const onRemoteAction = useCallback((action: AppAction) => {
    isRemoteRef.current = true;
    dispatch(action);
    queueMicrotask(() => {
      isRemoteRef.current = false;
    });
  }, []);

  const isShared = mode === 'shared' && Boolean(shareToken);

  const { status: syncStatus, otherEditors, broadcastAction } = useDocumentSync({
    shareToken: shareToken ?? '',
    tree: state.tree,
    enabled: isShared && isSupabaseConfigured(),
    onRemoteAction,
    onHydrate,
  });

  broadcastRef.current = broadcastAction;

  useEffect(() => {
    if (mode !== 'local') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState;
        if (parsed && Array.isArray(parsed.tree)) {
          dispatch({
            type: 'HYDRATE',
            payload: {
              tree: parsed.tree,
              zoomPath: sanitizeZoomPath(parsed.tree, parsed.zoomPath ?? []),
              settings: parsed.settings ?? { hideCompleted: false, theme: 'light' },
            },
          });
        }
      }
    } catch {
      /* ignore */
    }
    queueMicrotask(() => setPersistReady(true));
  }, [mode]);

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
  }, [state.settings.theme]);

  useEffect(() => {
    if (mode !== 'local' || !persistReady) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const payload: PersistedState = {
        tree: state.tree,
        zoomPath: state.zoomPath,
        settings: state.settings,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {
        /* ignore */
      }
    }, DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [mode, persistReady, state.tree, state.zoomPath, state.settings]);

  const wrappedDispatch = useCallback<Dispatch<AppAction>>(
    (action) => {
      if (isShared && (action.type === 'UNDO' || action.type === 'REDO')) return;
      dispatch(action);
      if (isRemoteRef.current) return;
      if (isShared) broadcastRef.current(action);
    },
    [isShared],
  );

  const createShareLink = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured.');
    }
    return createSharedDocument(state.tree);
  }, [state.tree]);

  const visibleChildren = useMemo(() => getVisibleForView(state), [state]);

  const resolvedSyncStatus: SyncConnectionStatus =
    mode === 'local' ? 'idle' : isSupabaseConfigured() ? syncStatus : 'error';

  const value = useMemo(
    () => ({
      state,
      dispatch: wrappedDispatch,
      visibleChildren,
      mode,
      shareToken,
      syncStatus: resolvedSyncStatus,
      otherEditors,
      createShareLink,
    }),
    [
      state,
      wrappedDispatch,
      visibleChildren,
      mode,
      shareToken,
      resolvedSyncStatus,
      otherEditors,
      createShareLink,
    ],
  );

  if (isShared && (resolvedSyncStatus === 'loading' || resolvedSyncStatus === 'idle')) {
    return (
      <div className="loading-screen">
        <p>Loading shared notes…</p>
      </div>
    );
  }

  if (isShared && resolvedSyncStatus === 'error') {
    return (
      <div className="loading-screen">
        <p>Could not load this shared document.</p>
        <p className="hint">Check the link or try again later.</p>
      </div>
    );
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
