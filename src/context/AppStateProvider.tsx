import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { appReducer, initialAppState } from '../state/reducer';
import type { AppState, PersistedState } from '../state/types';
import { getChildrenForZoom, sanitizeZoomPath } from '../state/treeOps';
import { AppStateContext } from './appStateContext';

const STORAGE_KEY = 'bullet-notes:v1';
const DEBOUNCE_MS = 400;

function getVisibleForView(state: AppState) {
  const raw = getChildrenForZoom(state.tree, state.zoomPath);
  if (!state.settings.hideCompleted) return raw;
  return raw.filter((n) => !n.completed);
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const [persistReady, setPersistReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
  }, [state.settings.theme]);

  useEffect(() => {
    if (!persistReady) return;
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
  }, [persistReady, state.tree, state.zoomPath, state.settings]);

  const visibleChildren = useMemo(() => getVisibleForView(state), [state]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      visibleChildren,
    }),
    [state, visibleChildren],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
