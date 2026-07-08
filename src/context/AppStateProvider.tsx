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
  clampActionToSharedRoot,
  serializeSelectionClipboardText,
} from '../state/treeOps';
import { isSupabaseConfigured } from '../lib/supabase';
import { toast } from 'sonner';
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

const SHARE_TOAST_ID = 'share-toast';
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
  const [editingBulletId, setEditingBulletId] = useState<string | null>(null);
  const [editingIndentParentId, setEditingIndentParentId] = useState<string | undefined>(undefined);
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
    lastEditedBy,
    broadcastAction,
  } = useDocumentSync({
    shareToken: shareToken ?? '',
    tree: state.tree,
    enabled: isShared && isSupabaseConfigured(),
    displayName,
    userId: user?.id ?? null,
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

  const { broadcastSubtreeAction, lastEditedByRoot } = useSharedSubtreeSync({
    tree: state.tree,
    enabled: isLocal && isSupabaseConfigured(),
    userId: user?.id ?? null,
    displayName,
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
      let outgoing = action;
      if (isShared) {
        const rootId = treeRef.current[0]?.id;
        if (rootId) {
          const clamped = clampActionToSharedRoot(treeRef.current, action, rootId);
          if (!clamped) return;
          outgoing = clamped;
        }
      }
      dispatch(outgoing);
      if (isRemoteRef.current) return;
      if (isShared) broadcastRef.current(outgoing);
      else if (isLocal) subtreeBroadcastRef.current(outgoing);
    },
    [isShared, isLocal],
  );

  const commitShareResult = useCallback((id: string, result: ShareResult) => {
    if (result === 'shared' || result === 'copied' || result === 'copy-failed') {
      pendingShareTokens.current.delete(id);
      if (result === 'copied') {
        toast('Link copied to clipboard', { id: SHARE_TOAST_ID });
      } else if (result === 'copy-failed') {
        toast('Link ready — copy it from "My shares"', { id: SHARE_TOAST_ID });
      } else {
        toast('Link shared', { id: SHARE_TOAST_ID });
      }
    }
  }, []);

  const ensureShareToken = useCallback(async (id: string): Promise<string> => {
    const node = findNodeById(treeRef.current, id);
    if (!node) throw new Error('Bullet not found');
    if (node.shareToken) return node.shareToken;

    const pending = pendingShareTokens.current.get(id);
    if (pending) return pending;

    const existing = pendingSharePromises.current.get(id);
    if (existing) return existing;

    const promise = (async () => {
      // extractSharedSubtree reads treeRef.current, which reflects the last *committed*
      // SET_NODE_SHARE for any descendant. There's a theoretical single-microtask window
      // between a descendant's createSharedDocument resolving and its SET_NODE_SHARE
      // landing here; closing it fully would require a server round-trip before every
      // share click, which isn't worth the added latency for this window's size.
      const subtree = extractSharedSubtree(treeRef.current, id);
      const token = await createSharedDocument(subtree);
      pendingShareTokens.current.set(id, token);
      // Commit immediately — the server document already exists, so the tree must
      // record it now rather than waiting on the (best-effort) share-sheet/clipboard
      // step below, which can fail without undoing the fact that this bullet is shared.
      dispatch({ type: 'SET_NODE_SHARE', id, shareToken: token });
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
      commitShareResult(id, result);
    },
    [commitShareResult],
  );

  const shareNode = useCallback(async (id: string) => {
    if (!isSupabaseConfigured()) {
      toast('Sharing is not configured. Add Supabase env vars and rebuild.', {
        id: SHARE_TOAST_ID,
        duration: 3000,
      });
      return;
    }
    const node = findNodeById(treeRef.current, id);
    if (!node) return;

    try {
      const token = await ensureShareToken(id);
      await openShareForBullet(id, token);
    } catch {
      toast('Could not share. Try again.', { id: SHARE_TOAST_ID, duration: 3000 });
    }
  }, [ensureShareToken, openShareForBullet]);

  const shareNodeFromGesture = useCallback(
    async (id: string) => {
      if (!isSupabaseConfigured()) {
        toast('Sharing is not configured. Add Supabase env vars and rebuild.', {
          id: SHARE_TOAST_ID,
          duration: 3000,
        });
        return;
      }
      const node = findNodeById(treeRef.current, id);
      if (!node) return;

      const token = getPendingShareToken(id);
      if (token) {
        try {
          await openShareForBullet(id, token);
        } catch {
          toast('Could not share. Try again.', { id: SHARE_TOAST_ID, duration: 3000 });
        }
        return;
      }

      toast('Preparing link…', { id: SHARE_TOAST_ID, duration: 3000 });
      try {
        const prepared = await ensureShareToken(id);
        await openShareForBullet(id, prepared);
      } catch {
        toast('Could not share. Try again.', { id: SHARE_TOAST_ID, duration: 3000 });
      }
    },
    [ensureShareToken, getPendingShareToken, openShareForBullet],
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
  // A ref (not state) because selectRange can be called multiple times within the same
  // synchronous event (e.g. a drag gesture crossing several bullets in one mousemove handler),
  // and state set during one call wouldn't be visible to a later call in that same batch.
  const selectionAnchorRef = useRef<string | null>(null);
  const visibleOrder = useMemo(
    () => getVisibleOrder(getVisibleForView(state), expanded, state.settings.hideCompleted),
    [state, expanded],
  );

  const clearSelection = useCallback(() => {
    selectionAnchorRef.current = null;
    setSelectedIds(new Set());
  }, []);

  const selectRange = useCallback(
    (id: string) => {
      if (!selectionAnchorRef.current) {
        selectionAnchorRef.current = id;
        setSelectedIds(new Set([id]));
        return;
      }
      const aIdx = visibleOrder.indexOf(selectionAnchorRef.current);
      const bIdx = visibleOrder.indexOf(id);
      if (aIdx === -1 || bIdx === -1) {
        selectionAnchorRef.current = id;
        setSelectedIds(new Set([id]));
        return;
      }
      const [lo, hi] = aIdx <= bIdx ? [aIdx, bIdx] : [bIdx, aIdx];
      setSelectedIds(new Set(visibleOrder.slice(lo, hi + 1)));
    },
    [visibleOrder],
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

  // Document-level (not per-bullet) so Cmd/Ctrl+C copies the selection regardless of what
  // currently has DOM focus — e.g. after shift-clicking bullet markers, focus sits on a marker
  // button, which is a sibling of the bullet text, so a per-row copy handler would never see it.
  useEffect(() => {
    const onCopy = (e: ClipboardEvent) => {
      if (selectedIds.size === 0) return;
      e.preventDefault();
      const orderedIds = visibleOrder.filter((id) => selectedIds.has(id));
      e.clipboardData?.setData('text/plain', serializeSelectionClipboardText(visibleChildren, orderedIds));
    };
    document.addEventListener('copy', onCopy);
    return () => document.removeEventListener('copy', onCopy);
  }, [selectedIds, visibleOrder, visibleChildren]);

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
      lastEditedBy,
      lastEditedByRoot,
      readOnly,
      shareNode,
      shareNodeFromGesture,
      getPendingShareToken,
      completeShareForBullet: commitShareResult,
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
      lastEditedBy,
      lastEditedByRoot,
      readOnly,
      shareNode,
      shareNodeFromGesture,
      getPendingShareToken,
      commitShareResult,
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
