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
import {
  getChildrenForZoom,
  sanitizeZoomPath,
  collectExpandableIds,
  findNodeById,
  extractSharedSubtree,
} from '../state/treeOps';
import { isSupabaseConfigured } from '../lib/supabase';
import { openShareSheet, shareUrl } from '../lib/shareNode';
import { createSharedDocument, useDocumentSync } from '../sync/useDocumentSync';
import { useSharedSubtreeSync } from '../sync/useSharedSubtreeSync';
import { useUserDocumentSync } from '../sync/useUserDocumentSync';
import type { SyncConnectionStatus } from '../sync/syncTypes';
import { AppStateContext, type AppMode } from './appStateContext';

const STORAGE_KEY = 'bullet-notes:v1';

function getVisibleForView(state: AppState) {
  const raw = getChildrenForZoom(state.tree, state.zoomPath);
  if (!state.settings.hideCompleted) return raw;
  return raw.filter((n) => !n.completed);
}

function readLocalStoragePayload(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed || !Array.isArray(parsed.tree) || parsed.tree.length === 0) return null;
    return {
      tree: parsed.tree,
      zoomPath: sanitizeZoomPath(parsed.tree, parsed.zoomPath ?? []),
      settings: parsed.settings ?? { hideCompleted: false, theme: 'light' },
    };
  } catch {
    return null;
  }
}

type Props = {
  children: ReactNode;
  mode: AppMode;
  shareToken?: string;
};

export function AppStateProvider({ children, mode, shareToken }: Props) {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [editingBulletId, setEditingBulletId] = useState<string | null>(null);
  const [editingIndentParentId, setEditingIndentParentId] = useState<string | undefined>(undefined);
  const shareMessageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemoteRef = useRef(false);
  const broadcastRef = useRef<(action: AppAction) => void>(() => {});
  const subtreeBroadcastRef = useRef<(action: AppAction) => void>(() => {});
  const settingsRef = useRef(state.settings);
  const treeRef = useRef(state.tree);
  settingsRef.current = state.settings;
  treeRef.current = state.tree;

  const onHydrateShared = useCallback((tree: BulletNode[]) => {
    dispatch({
      type: 'HYDRATE',
      payload: {
        tree,
        zoomPath: [],
        settings: settingsRef.current,
      },
    });
  }, []);

  const onHydrateUser = useCallback((payload: PersistedState) => {
    dispatch({
      type: 'HYDRATE',
      payload: {
        tree: payload.tree,
        zoomPath: sanitizeZoomPath(payload.tree, payload.zoomPath ?? []),
        settings: payload.settings ?? { hideCompleted: false, theme: 'light' },
      },
    });
  }, []);

  const onFirstVisit = useCallback((): PersistedState | null => {
    const local = readLocalStoragePayload();
    if (local) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      return local;
    }
    return null;
  }, []);

  const onRemoteAction = useCallback((action: AppAction) => {
    isRemoteRef.current = true;
    dispatch(action);
    queueMicrotask(() => {
      isRemoteRef.current = false;
    });
  }, []);

  const isShared = mode === 'shared' && Boolean(shareToken);
  const isLocal = mode === 'local';

  const { status: sharedSyncStatus, otherEditors, broadcastAction } = useDocumentSync({
    shareToken: shareToken ?? '',
    tree: state.tree,
    enabled: isShared && isSupabaseConfigured(),
    onRemoteAction,
    onHydrate: onHydrateShared,
  });

  const { status: userSyncStatus } = useUserDocumentSync({
    tree: state.tree,
    zoomPath: state.zoomPath,
    settings: state.settings,
    enabled: isLocal && isSupabaseConfigured(),
    onHydrate: onHydrateUser,
    onFirstVisit,
  });

  const { broadcastSubtreeAction } = useSharedSubtreeSync({
    tree: state.tree,
    enabled: isLocal && isSupabaseConfigured(),
    onRemoteAction,
  });

  broadcastRef.current = broadcastAction;
  subtreeBroadcastRef.current = broadcastSubtreeAction;

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
  }, [state.settings.theme]);

  const wrappedDispatch = useCallback<Dispatch<AppAction>>(
    (action) => {
      if (isShared && (action.type === 'UNDO' || action.type === 'REDO')) return;
      dispatch(action);
      if (isRemoteRef.current) return;
      if (isShared) broadcastRef.current(action);
      else if (isLocal) subtreeBroadcastRef.current(action);
    },
    [isShared, isLocal],
  );

  const shareNode = useCallback(async (id: string) => {
    if (!isSupabaseConfigured()) {
      const msg = 'Sharing is not configured. Add Supabase env vars and rebuild.';
      setShareMessage(msg);
      if (shareMessageTimer.current) clearTimeout(shareMessageTimer.current);
      shareMessageTimer.current = setTimeout(() => setShareMessage(null), 3000);
      return;
    }
    const node = findNodeById(treeRef.current, id);
    if (!node) return;

    try {
      let token = node.shareToken;
      if (!token) {
        const subtree = extractSharedSubtree(treeRef.current, id);
        token = await createSharedDocument(subtree);
        dispatch({ type: 'SET_NODE_SHARE', id, shareToken: token });
      }

      const url = shareUrl(token);
      const title = `${(node.text.trim() || 'Shared bullet')} — Bullet Notes`;
      const result = await openShareSheet(title, url);

      if (shareMessageTimer.current) clearTimeout(shareMessageTimer.current);
      setShareMessage(result === 'copied' ? 'Link copied to clipboard' : null);
      if (result === 'copied') {
        shareMessageTimer.current = setTimeout(() => setShareMessage(null), 2500);
      }
    } catch {
      if (shareMessageTimer.current) clearTimeout(shareMessageTimer.current);
      setShareMessage('Could not share. Try again.');
      shareMessageTimer.current = setTimeout(() => setShareMessage(null), 3000);
    }
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const ensureExpanded = useCallback((id: string) => {
    setExpanded((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const nodes = getChildrenForZoom(state.tree, state.zoomPath);
    setExpanded(new Set(collectExpandableIds(nodes)));
  }, [state.tree, state.zoomPath]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const setEditingBullet = useCallback((id: string, indentParentId?: string) => {
    setEditingBulletId(id);
    setEditingIndentParentId(indentParentId);
  }, []);

  const clearEditingBullet = useCallback(() => {
    setEditingBulletId(null);
    setEditingIndentParentId(undefined);
  }, []);

  const visibleChildren = useMemo(() => getVisibleForView(state), [state]);

  const resolvedSyncStatus: SyncConnectionStatus = isShared
    ? isSupabaseConfigured()
      ? sharedSyncStatus
      : 'error'
    : isSupabaseConfigured()
      ? userSyncStatus
      : 'error';

  const value = useMemo(
    () => ({
      state,
      dispatch: wrappedDispatch,
      visibleChildren,
      expanded,
      toggleExpand,
      ensureExpanded,
      expandAll,
      collapseAll,
      mode,
      shareToken,
      syncStatus: resolvedSyncStatus,
      otherEditors,
      shareNode,
      shareMessage,
      editingBulletId,
      editingIndentParentId,
      setEditingBullet,
      clearEditingBullet,
    }),
    [
      state,
      wrappedDispatch,
      visibleChildren,
      expanded,
      toggleExpand,
      ensureExpanded,
      expandAll,
      collapseAll,
      mode,
      shareToken,
      resolvedSyncStatus,
      otherEditors,
      shareNode,
      shareMessage,
      editingBulletId,
      editingIndentParentId,
      setEditingBullet,
      clearEditingBullet,
    ],
  );

  if (isShared && (resolvedSyncStatus === 'loading' || resolvedSyncStatus === 'idle')) {
    return (
      <div className="loading-screen">
        <p>Loading shared notes…</p>
      </div>
    );
  }

  if (isLocal && (resolvedSyncStatus === 'loading' || resolvedSyncStatus === 'idle')) {
    return (
      <div className="loading-screen">
        <p>Loading your notes…</p>
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

  if (isLocal && resolvedSyncStatus === 'error') {
    return (
      <div className="loading-screen">
        <p>Could not load your notes.</p>
        <p className="hint">Check your connection and try again.</p>
      </div>
    );
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
