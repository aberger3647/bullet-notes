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
import type { AppAction, AppState, PersistedState } from '../state/types';
import { getChildrenForZoom, collectExpandableIds, findNodeById, extractSharedSubtree } from '../state/treeOps';
import { isSupabaseConfigured } from '../lib/supabase';
import { openShareSheet, shareUrl, type ShareResult } from '../lib/shareNode';
import { createSharedDocument } from '../sync/useDocumentSync';
import { useDocSync } from '../sync/useDocSync';
import { AppStateContext } from './appStateContext';

function getVisibleForView(state: AppState) {
  const raw = getChildrenForZoom(state.tree, state.zoomPath);
  if (!state.settings.hideCompleted) return raw;
  return raw.filter((n) => !n.completed);
}

type Props = {
  children: ReactNode;
  docId: string;
};

/**
 * Provider for a single secondary document (multi-document feature). Deliberately
 * simpler than AppStateProvider: no realtime collab, no expand/collapse or undo
 * history persistence across reload — those are acceptable v1 gaps for a personal
 * scratch document, not regressions in the primary local/shared flows.
 */
export function DocStateProvider({ children, docId }: Props) {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [editingBulletId, setEditingBulletId] = useState<string | null>(null);
  const [editingIndentParentId, setEditingIndentParentId] = useState<string | undefined>(undefined);
  const shareMessageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingShareTokens = useRef(new Map<string, string>());
  const pendingSharePromises = useRef(new Map<string, Promise<string>>());
  const treeRef = useRef(state.tree);
  useEffect(() => {
    treeRef.current = state.tree;
  });

  const onHydrate = useCallback((payload: PersistedState) => {
    dispatch({ type: 'HYDRATE', payload });
  }, []);

  const { status: syncStatus } = useDocSync({
    docId,
    tree: state.tree,
    zoomPath: state.zoomPath,
    settings: state.settings,
    enabled: isSupabaseConfigured(),
    onHydrate,
  });

  const wrappedDispatch = useCallback<Dispatch<AppAction>>((action) => dispatch(action), []);

  const showShareToast = useCallback((msg: string | null, durationMs = 2500) => {
    if (shareMessageTimer.current) clearTimeout(shareMessageTimer.current);
    setShareMessage(msg);
    if (msg) shareMessageTimer.current = setTimeout(() => setShareMessage(null), durationMs);
  }, []);

  const commitShareResult = useCallback(
    (id: string, token: string, result: ShareResult) => {
      if (result === 'shared' || result === 'copied') {
        const n = findNodeById(treeRef.current, id);
        if (n && !n.shareToken) dispatch({ type: 'SET_NODE_SHARE', id, shareToken: token });
        pendingShareTokens.current.delete(id);
        showShareToast(result === 'copied' ? 'Link copied to clipboard' : null);
      }
    },
    [showShareToast],
  );

  const ensureShareToken = useCallback(async (id: string): Promise<string> => {
    const n = findNodeById(treeRef.current, id);
    if (!n) throw new Error('Bullet not found');
    if (n.shareToken) return n.shareToken;
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
    const n = findNodeById(treeRef.current, id);
    return n?.shareToken ?? pendingShareTokens.current.get(id);
  }, []);

  const openShareForBullet = useCallback(
    async (id: string, token: string) => {
      const n = findNodeById(treeRef.current, id);
      if (!n) return;
      const result = await openShareSheet(`${n.text.trim() || 'Shared bullet'} — Bullet Notes`, shareUrl(token));
      commitShareResult(id, token, result);
    },
    [commitShareResult],
  );

  const shareNode = useCallback(
    async (id: string) => {
      if (!isSupabaseConfigured()) {
        showShareToast('Sharing is not configured. Add Supabase env vars and rebuild.', 3000);
        return;
      }
      try {
        await openShareForBullet(id, await ensureShareToken(id));
      } catch {
        showShareToast('Could not share. Try again.', 3000);
      }
    },
    [ensureShareToken, openShareForBullet, showShareToast],
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
    setExpanded((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  const expandAll = useCallback(() => {
    setExpanded(new Set(collectExpandableIds(getChildrenForZoom(state.tree, state.zoomPath))));
  }, [state.tree, state.zoomPath]);

  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  const keepEditingBullet = useCallback(() => {}, []);
  const scheduleClearEditingBullet = useCallback(() => {
    setEditingBulletId(null);
    setEditingIndentParentId(undefined);
  }, []);
  const setEditingBullet = useCallback((id: string, indentParentId?: string) => {
    setEditingBulletId(id);
    setEditingIndentParentId(indentParentId);
  }, []);

  const visibleChildren = useMemo(() => getVisibleForView(state), [state]);

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
      mode: 'local' as const,
      shareToken: undefined,
      syncStatus,
      otherEditors: 0,
      otherPresences: [],
      readOnly: false,
      shareNode,
      shareNodeFromGesture: shareNode,
      getPendingShareToken,
      completeShareForBullet: commitShareResult,
      shareMessage,
      editingBulletId,
      editingIndentParentId,
      setEditingBullet,
      scheduleClearEditingBullet,
      keepEditingBullet,
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
      syncStatus,
      shareNode,
      getPendingShareToken,
      commitShareResult,
      shareMessage,
      editingBulletId,
      editingIndentParentId,
      setEditingBullet,
      scheduleClearEditingBullet,
      keepEditingBullet,
    ],
  );

  if (syncStatus === 'loading' || syncStatus === 'idle') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
        <p>Loading document…</p>
      </div>
    );
  }

  if (syncStatus === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
        <p>Could not load this document.</p>
        <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
      </div>
    );
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
