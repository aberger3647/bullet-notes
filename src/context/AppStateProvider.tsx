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
import type { AppAction, AppState, BulletNode, HistoryState, PersistedState } from '../state/types';
import {
  getChildrenForZoom,
  sanitizeZoomPath,
  collectExpandableIds,
  findNodeById,
  extractSharedSubtree,
  getVisibleOrder,
} from '../state/treeOps';
import { isSupabaseConfigured } from '../lib/supabase';
import { openShareSheet, shareUrl, type ShareResult } from '../lib/shareNode';
import { createSharedDocument, useDocumentSync } from '../sync/useDocumentSync';
import { useSharedSubtreeSync } from '../sync/useSharedSubtreeSync';
import { useUserDocumentSync } from '../sync/useUserDocumentSync';
import { takeSnapshot } from '../sync/snapshotApi';
import { shouldSnapshotToday, todayKey } from '../lib/snapshotSchedule';
import type { SyncConnectionStatus } from '../sync/syncTypes';
import { useAuth } from '../hooks/useAuth';
import { AppStateContext, type AppMode } from './appStateContext';
import { OutlineLoadingSkeleton } from '../components/OutlineLoadingSkeleton';

const STORAGE_KEY = 'bullet-notes:v1';
const EXPANDED_STORAGE_KEY = 'bullet-notes:v1:expanded';
const HISTORY_STORAGE_KEY = 'bullet-notes:v1:history';
const LAST_SNAPSHOT_STORAGE_KEY = 'bullet-notes:v1:lastSnapshotDate';

function expandedStorageKey(mode: AppMode, shareToken?: string): string {
  return mode === 'shared' && shareToken
    ? `${EXPANDED_STORAGE_KEY}:shared:${shareToken}`
    : EXPANDED_STORAGE_KEY;
}

function readExpandedFromStorage(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((x): x is string => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function writeExpandedToStorage(key: string, expanded: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...expanded]));
  } catch {
    /* ignore quota/availability errors */
  }
}

function readHistoryFromStorage(): HistoryState | null {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HistoryState;
    if (!parsed || !Array.isArray(parsed.past) || !Array.isArray(parsed.future)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeHistoryToStorage(history: HistoryState) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    /* ignore quota/availability errors */
  }
}

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
  const { user } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email || 'Someone';
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    readExpandedFromStorage(expandedStorageKey(mode, shareToken)),
  );
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [editingBulletId, setEditingBulletId] = useState<string | null>(null);
  const [editingIndentParentId, setEditingIndentParentId] = useState<string | undefined>(undefined);
  const shareMessageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingShareTokens = useRef(new Map<string, string>());
  const pendingSharePromises = useRef(new Map<string, Promise<string>>());
  const isRemoteRef = useRef(false);
  const broadcastRef = useRef<(action: AppAction) => void>(() => {});
  const subtreeBroadcastRef = useRef<(action: AppAction) => void>(() => {});
  const settingsRef = useRef(state.settings);
  const treeRef = useRef(state.tree);
  useEffect(() => {
    settingsRef.current = state.settings;
    treeRef.current = state.tree;
  });

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

  const {
    status: sharedSyncStatus,
    otherEditors,
    otherPresences,
    permission: sharedPermission,
    broadcastAction,
  } = useDocumentSync({
    shareToken: shareToken ?? '',
    tree: state.tree,
    enabled: isShared && isSupabaseConfigured(),
    displayName,
    editingId: editingBulletId,
    onRemoteAction,
    onHydrate: onHydrateShared,
  });
  const readOnly = isShared && sharedPermission === 'view';

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

  useEffect(() => {
    broadcastRef.current = broadcastAction;
    subtreeBroadcastRef.current = broadcastSubtreeAction;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
  }, [state.settings.theme]);

  useEffect(() => {
    writeExpandedToStorage(expandedStorageKey(mode, shareToken), expanded);
  }, [expanded, mode, shareToken]);

  const historyRestoredRef = useRef(false);
  useEffect(() => {
    if (!isLocal || historyRestoredRef.current) return;
    if (state.tree === initialAppState.tree) return; // not hydrated yet
    historyRestoredRef.current = true;
    const saved = readHistoryFromStorage();
    if (saved && (saved.past.length > 0 || saved.future.length > 0)) {
      dispatch({ type: 'RESTORE_HISTORY', history: saved });
    }
  }, [isLocal, state.tree]);

  useEffect(() => {
    if (!isLocal || !historyRestoredRef.current) return;
    writeHistoryToStorage(state.history);
  }, [isLocal, state.history]);

  // Daily version-history snapshot: at most once per calendar day, once the
  // primary document has loaded, ask the server to snapshot it (for "restore
  // yesterday"-style recovery). Best-effort — failures are silently ignored.
  useEffect(() => {
    if (!isLocal || userSyncStatus !== 'connected' || !isSupabaseConfigured()) return;
    let cancelled = false;
    const now = new Date();
    let lastKey: string | null = null;
    try {
      lastKey = localStorage.getItem(LAST_SNAPSHOT_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    if (!shouldSnapshotToday(lastKey, now)) return;
    void takeSnapshot()
      .then(() => {
        if (cancelled) return;
        try {
          localStorage.setItem(LAST_SNAPSHOT_STORAGE_KEY, todayKey(now));
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* best-effort; try again next time status reconnects */
      });
    return () => {
      cancelled = true;
    };
  }, [isLocal, userSyncStatus]);

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

  const showShareToast = useCallback((msg: string | null, durationMs = 2500) => {
    if (shareMessageTimer.current) clearTimeout(shareMessageTimer.current);
    setShareMessage(msg);
    if (msg) {
      shareMessageTimer.current = setTimeout(() => setShareMessage(null), durationMs);
    }
  }, []);

  const commitShareResult = useCallback(
    (id: string, token: string, result: ShareResult) => {
      if (result === 'shared' || result === 'copied') {
        const node = findNodeById(treeRef.current, id);
        if (node && !node.shareToken) {
          dispatch({ type: 'SET_NODE_SHARE', id, shareToken: token });
        }
        pendingShareTokens.current.delete(id);
        showShareToast(result === 'copied' ? 'Link copied to clipboard' : null);
      }
    },
    [showShareToast],
  );

  const ensureShareToken = useCallback(async (id: string): Promise<string> => {
    const node = findNodeById(treeRef.current, id);
    if (!node) throw new Error('Bullet not found');
    if (node.shareToken) return node.shareToken;

    const pending = pendingShareTokens.current.get(id);
    if (pending) return pending;

    const existing = pendingSharePromises.current.get(id);
    if (existing) return existing;

    const promise = (async () => {
      const subtree = extractSharedSubtree(treeRef.current, id);
      const token = await createSharedDocument(subtree);
      pendingShareTokens.current.set(id, token);
      pendingSharePromises.current.delete(id);
      return token;
    })();
    pendingSharePromises.current.set(id, promise);
    return promise;
  }, []);

  const getPendingShareToken = useCallback((id: string): string | undefined => {
    const node = findNodeById(treeRef.current, id);
    if (node?.shareToken) return node.shareToken;
    return pendingShareTokens.current.get(id);
  }, []);

  const openShareForBullet = useCallback(
    async (id: string, token: string) => {
      const node = findNodeById(treeRef.current, id);
      if (!node) return;
      const url = shareUrl(token);
      const title = `${(node.text.trim() || 'Shared bullet')} — Honeydew`;
      const result = await openShareSheet(title, url);
      commitShareResult(id, token, result);
    },
    [commitShareResult],
  );

  const shareNode = useCallback(async (id: string) => {
    if (!isSupabaseConfigured()) {
      showShareToast('Sharing is not configured. Add Supabase env vars and rebuild.', 3000);
      return;
    }
    const node = findNodeById(treeRef.current, id);
    if (!node) return;

    try {
      const token = await ensureShareToken(id);
      await openShareForBullet(id, token);
    } catch {
      showShareToast('Could not share. Try again.', 3000);
    }
  }, [ensureShareToken, openShareForBullet, showShareToast]);

  const shareNodeFromGesture = useCallback(
    async (id: string) => {
      if (!isSupabaseConfigured()) {
        showShareToast('Sharing is not configured. Add Supabase env vars and rebuild.', 3000);
        return;
      }
      const node = findNodeById(treeRef.current, id);
      if (!node) return;

      const token = getPendingShareToken(id);
      if (token) {
        try {
          await openShareForBullet(id, token);
        } catch {
          showShareToast('Could not share. Try again.', 3000);
        }
        return;
      }

      showShareToast('Preparing link…', 3000);
      try {
        const prepared = await ensureShareToken(id);
        await openShareForBullet(id, prepared);
      } catch {
        showShareToast('Could not share. Try again.', 3000);
      }
    },
    [ensureShareToken, getPendingShareToken, openShareForBullet, showShareToast],
  );

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

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);
  const visibleOrder = useMemo(
    () => getVisibleOrder(getVisibleForView(state), expanded, state.settings.hideCompleted),
    [state, expanded],
  );

  const clearSelection = useCallback(() => {
    setSelectionAnchor(null);
    setSelectedIds(new Set());
  }, []);

  const selectRange = useCallback(
    (id: string) => {
      if (!selectionAnchor) {
        setSelectionAnchor(id);
        setSelectedIds(new Set([id]));
        return;
      }
      const aIdx = visibleOrder.indexOf(selectionAnchor);
      const bIdx = visibleOrder.indexOf(id);
      if (aIdx === -1 || bIdx === -1) {
        setSelectionAnchor(id);
        setSelectedIds(new Set([id]));
        return;
      }
      const [lo, hi] = aIdx <= bIdx ? [aIdx, bIdx] : [bIdx, aIdx];
      setSelectedIds(new Set(visibleOrder.slice(lo, hi + 1)));
    },
    [selectionAnchor, visibleOrder],
  );

  const bulkIndent = useCallback(() => {
    const ids = visibleOrder.filter((id) => selectedIds.has(id));
    if (ids.length === 0) return;
    wrappedDispatch({ type: 'BULK_INDENT', ids });
    clearSelection();
  }, [visibleOrder, selectedIds, wrappedDispatch, clearSelection]);

  const bulkOutdent = useCallback(() => {
    const ids = visibleOrder.filter((id) => selectedIds.has(id));
    if (ids.length === 0) return;
    wrappedDispatch({ type: 'BULK_OUTDENT', ids });
    clearSelection();
  }, [visibleOrder, selectedIds, wrappedDispatch, clearSelection]);

  const bulkToggleComplete = useCallback(() => {
    const ids = visibleOrder.filter((id) => selectedIds.has(id));
    if (ids.length === 0) return;
    wrappedDispatch({ type: 'BULK_TOGGLE_COMPLETE', ids });
    clearSelection();
  }, [visibleOrder, selectedIds, wrappedDispatch, clearSelection]);

  const clearEditingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const keepEditingBullet = useCallback(() => {
    if (clearEditingTimerRef.current) {
      clearTimeout(clearEditingTimerRef.current);
      clearEditingTimerRef.current = null;
    }
  }, []);

  const scheduleClearEditingBullet = useCallback(() => {
    if (clearEditingTimerRef.current) clearTimeout(clearEditingTimerRef.current);
    clearEditingTimerRef.current = setTimeout(() => {
      clearEditingTimerRef.current = null;
      setEditingBulletId(null);
      setEditingIndentParentId(undefined);
    }, 200);
  }, []);

  const setEditingBullet = useCallback((id: string, indentParentId?: string) => {
    keepEditingBullet();
    setEditingBulletId(id);
    setEditingIndentParentId(indentParentId);
    clearSelection();
  }, [keepEditingBullet, clearSelection]);

  useEffect(() => {
    if (!editingBulletId || isShared || !isSupabaseConfigured()) return;
    if (!window.matchMedia('(hover: none)').matches) return;
    const node = findNodeById(treeRef.current, editingBulletId);
    if (!node || node.shareToken) return;
    if (pendingShareTokens.current.has(editingBulletId)) return;
    if (pendingSharePromises.current.has(editingBulletId)) return;
    void ensureShareToken(editingBulletId).catch(() => {});
  }, [editingBulletId, isShared, ensureShareToken]);

  useEffect(
    () => () => {
      if (clearEditingTimerRef.current) clearTimeout(clearEditingTimerRef.current);
    },
    [],
  );

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
      otherPresences,
      readOnly,
      shareNode,
      shareNodeFromGesture,
      getPendingShareToken,
      completeShareForBullet: commitShareResult,
      shareMessage,
      editingBulletId,
      editingIndentParentId,
      setEditingBullet,
      scheduleClearEditingBullet,
      keepEditingBullet,
      selectedIds,
      selectRange,
      clearSelection,
      bulkIndent,
      bulkOutdent,
      bulkToggleComplete,
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
      otherPresences,
      readOnly,
      shareNode,
      shareNodeFromGesture,
      getPendingShareToken,
      commitShareResult,
      shareMessage,
      editingBulletId,
      editingIndentParentId,
      setEditingBullet,
      scheduleClearEditingBullet,
      keepEditingBullet,
      selectedIds,
      selectRange,
      clearSelection,
      bulkIndent,
      bulkOutdent,
      bulkToggleComplete,
    ],
  );

  if (isShared && (resolvedSyncStatus === 'loading' || resolvedSyncStatus === 'idle')) {
    return <OutlineLoadingSkeleton />;
  }

  if (isLocal && (resolvedSyncStatus === 'loading' || resolvedSyncStatus === 'idle')) {
    return <OutlineLoadingSkeleton />;
  }

  if (isShared && resolvedSyncStatus === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
        <p>Could not load this shared document.</p>
        <p className="text-sm text-muted-foreground">Check the link or try again later.</p>
      </div>
    );
  }

  if (isLocal && resolvedSyncStatus === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
        <p>Could not load your notes.</p>
        <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
      </div>
    );
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
