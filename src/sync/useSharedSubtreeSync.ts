import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { AppAction, BulletNode } from '../state/types';
import {
  clampActionToSharedRoot,
  collectSharedRoots,
  extractSharedSubtree,
  getActionNodeIds,
  getShareRootsForNode,
} from '../state/treeOps';
import { fetchDocumentMeta, parseBroadcastMessage, persistDocument } from './documentApi';
import {
  isSyncableAction,
  RECONNECT_DELAY_MS,
  SAVE_DEBOUNCE_MS,
  TEXT_BROADCAST_MS,
  type BroadcastMessage,
} from './syncTypes';

type SharedRoot = { id: string; shareToken: string };

export type LastEditedByEntry = { name: string; at: string };

type ChannelBundle = {
  rootId: string;
  shareToken: string;
  channel: RealtimeChannel;
  subscribed: boolean;
  textTimers: Map<string, ReturnType<typeof setTimeout>>;
  pendingText: Map<string, string>;
  saveTimer: ReturnType<typeof setTimeout> | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  destroyed: boolean;
  // clientId -> displayName, from presence. Lets a live broadcast resolve "who sent
  // this" instantly, without a DB round-trip that would otherwise race the sender's
  // own (much longer-debounced) save — see refreshMeta below for the mount-time read.
  presenceNames: Map<string, string>;
};

type UseSharedSubtreeSyncOptions = {
  tree: BulletNode[];
  enabled: boolean;
  userId: string | null;
  displayName: string;
  onRemoteAction: (action: AppAction) => void;
};

function createChannelBundle(
  root: SharedRoot,
  clientId: string,
  displayName: string,
  getTree: () => BulletNode[],
  onRemoteAction: (action: AppAction, editorName: string | undefined) => void,
  onSubscribedChange: (token: string, subscribed: boolean) => void,
): ChannelBundle {
  const bundle: ChannelBundle = {
    rootId: root.id,
    shareToken: root.shareToken,
    channel: null as unknown as RealtimeChannel,
    subscribed: false,
    textTimers: new Map(),
    pendingText: new Map(),
    saveTimer: null,
    reconnectTimer: null,
    destroyed: false,
    presenceNames: new Map(),
  };

  const connect = () => {
    if (bundle.destroyed) return;
    const previousChannel: RealtimeChannel | null = bundle.channel;
    const channel = supabase.channel(`doc:${root.shareToken}`, {
      config: {
        broadcast: { self: false },
        presence: { key: clientId },
      },
    });
    bundle.channel = channel;

    channel
      .on('broadcast', { event: 'action' }, (raw) => {
        const msg = parseBroadcastMessage(raw);
        if (!msg || msg.source === clientId) return;
        const clamped = clampActionToSharedRoot(getTree(), msg.action, root.id);
        if (clamped) onRemoteAction(clamped, bundle.presenceNames.get(msg.source));
      })
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState<{ clientId: string; displayName: string }>();
        const all = Object.values(presenceState).flat();
        bundle.presenceNames = new Map(all.map((p) => [p.clientId, p.displayName]));
      })
      .subscribe((status) => {
        if (bundle.destroyed) return;
        if (status === 'SUBSCRIBED') {
          bundle.subscribed = true;
          onSubscribedChange(root.shareToken, true);
          void channel.track({ clientId, displayName });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          bundle.subscribed = false;
          onSubscribedChange(root.shareToken, false);
          bundle.reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      });

    if (previousChannel) void supabase.removeChannel(previousChannel);
  };

  connect();
  return bundle;
}

function flushBundleText(bundle: ChannelBundle, clientId: string) {
  for (const timer of bundle.textTimers.values()) clearTimeout(timer);
  bundle.textTimers.clear();
  for (const [id, text] of bundle.pendingText.entries()) {
    const payload: BroadcastMessage = {
      source: clientId,
      action: { type: 'SET_TEXT', id, text },
      ts: Date.now(),
    };
    void bundle.channel.send({ type: 'broadcast', event: 'action', payload });
  }
  bundle.pendingText.clear();
}

function broadcastOnBundle(bundle: ChannelBundle, clientId: string, action: AppAction) {
  if (!bundle.subscribed) return;

  if (action.type === 'SET_TEXT') {
    bundle.pendingText.set(action.id, action.text);
    const existing = bundle.textTimers.get(action.id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      bundle.textTimers.delete(action.id);
      const text = bundle.pendingText.get(action.id);
      if (text === undefined) return;
      bundle.pendingText.delete(action.id);
      const payload: BroadcastMessage = {
        source: clientId,
        action: { type: 'SET_TEXT', id: action.id, text },
        ts: Date.now(),
      };
      void bundle.channel.send({ type: 'broadcast', event: 'action', payload });
    }, TEXT_BROADCAST_MS);
    bundle.textTimers.set(action.id, timer);
    return;
  }

  flushBundleText(bundle, clientId);
  const payload: BroadcastMessage = { source: clientId, action, ts: Date.now() };
  void bundle.channel.send({ type: 'broadcast', event: 'action', payload });
}

async function teardownBundle(bundle: ChannelBundle) {
  bundle.destroyed = true;
  for (const timer of bundle.textTimers.values()) clearTimeout(timer);
  bundle.textTimers.clear();
  bundle.pendingText.clear();
  if (bundle.saveTimer) clearTimeout(bundle.saveTimer);
  if (bundle.reconnectTimer) clearTimeout(bundle.reconnectTimer);
  bundle.subscribed = false;
  await supabase.removeChannel(bundle.channel);
}

export function useSharedSubtreeSync({
  tree,
  enabled,
  userId,
  displayName,
  onRemoteAction,
}: UseSharedSubtreeSyncOptions) {
  const clientIdRef = useRef(crypto.randomUUID());
  const channelsRef = useRef<Map<string, ChannelBundle>>(new Map());
  const treeRef = useRef(tree);
  const onRemoteActionRef = useRef(onRemoteAction);
  const userIdRef = useRef(userId);
  const displayNameRef = useRef(displayName);
  const sharedRoots = useMemo(() => collectSharedRoots(tree), [tree]);
  const sharedRootsRef = useRef(sharedRoots);
  const [lastEditedByRoot, setLastEditedByRoot] = useState<Map<string, LastEditedByEntry>>(new Map());
  useEffect(() => {
    treeRef.current = tree;
    onRemoteActionRef.current = onRemoteAction;
    sharedRootsRef.current = sharedRoots;
    userIdRef.current = userId;
    displayNameRef.current = displayName;
  });

  const sharedRootsKey = useMemo(
    () => sharedRoots.map((r) => `${r.id}:${r.shareToken}`).join(','),
    [sharedRoots],
  );

  // One-shot read of already-persisted attribution when a shared root mounts — the
  // "even if the other person isn't online right now" case. A *live* update (both
  // parties connected) is handled separately, straight off the broadcast + presence
  // below, since a DB read here would race the sender's own much-longer-debounced save.
  const readInitialMeta = useCallback((rootId: string, shareToken: string) => {
    void fetchDocumentMeta(shareToken)
      .then((meta) => {
        if (!meta) return;
        setLastEditedByRoot((prev) => {
          const next = new Map(prev);
          if (meta.last_edited_by && meta.last_edited_by !== userIdRef.current) {
            next.set(rootId, { name: meta.last_edited_by_name || 'Someone', at: meta.updated_at });
          } else {
            next.delete(rootId);
          }
          return next;
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured()) return;

    const clientId = clientIdRef.current;
    const current = channelsRef.current;
    const roots = sharedRootsRef.current;
    const desiredTokens = new Set(roots.map((r) => r.shareToken));

    for (const [token, bundle] of current.entries()) {
      if (!desiredTokens.has(token)) {
        void teardownBundle(bundle);
        current.delete(token);
        setLastEditedByRoot((prev) => {
          if (!prev.has(bundle.rootId)) return prev;
          const next = new Map(prev);
          next.delete(bundle.rootId);
          return next;
        });
      }
    }

    for (const root of roots) {
      if (current.has(root.shareToken)) continue;
      const bundle = createChannelBundle(
        root,
        clientId,
        displayNameRef.current,
        () => treeRef.current,
        (action, editorName) => {
          onRemoteActionRef.current(action);
          setLastEditedByRoot((prev) => {
            const next = new Map(prev);
            next.set(root.id, { name: editorName || 'Someone', at: new Date().toISOString() });
            return next;
          });
          toast(`${editorName || 'Someone'} is editing a shared list`, { id: `edit-toast-${root.shareToken}` });
        },
        () => {},
      );
      current.set(root.shareToken, bundle);
      readInitialMeta(root.id, root.shareToken);
    }

    return () => {
      for (const bundle of current.values()) {
        void teardownBundle(bundle);
      }
      current.clear();
    };
    // sharedRootsKey (not `sharedRoots`, which is a new array reference on every tree
    // edit) is what this effect actually needs to react to — otherwise an unrelated
    // text edit would tear down and recreate every shared-root channel, and the fresh,
    // not-yet-subscribed bundle would silently miss that same edit's scheduled save.
  }, [enabled, sharedRootsKey, readInitialMeta]);

  // Scoped to a single root and called only from broadcastSubtreeAction below — i.e.
  // only for a genuinely local edit, never one echoed back in via a remote broadcast.
  // Saving unconditionally on every tree change (as this used to) meant that whichever
  // peer's debounce timer happened to fire last would stamp `last_edited_by` with
  // itself, even on a root it never actually touched. flushAll (beforeunload) remains
  // unconditional across all roots, as a resilience fallback.
  const scheduleSaveForRoot = useCallback((rootId: string, shareToken: string) => {
    const bundle = channelsRef.current.get(shareToken);
    if (!bundle?.subscribed) return;
    if (bundle.saveTimer) clearTimeout(bundle.saveTimer);
    bundle.saveTimer = setTimeout(() => {
      bundle.saveTimer = null;
      const subtree = extractSharedSubtree(treeRef.current, rootId);
      if (subtree.length === 0) return;
      void persistDocument(shareToken, subtree).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const broadcastSubtreeAction = useCallback(
    (action: AppAction) => {
      if (!enabled || !isSyncableAction(action)) return;

      const nodeIds = getActionNodeIds(action);
      const affectedRoots = new Map<string, string>(); // shareToken -> rootId
      for (const nodeId of nodeIds) {
        for (const root of getShareRootsForNode(treeRef.current, nodeId)) {
          affectedRoots.set(root.shareToken, root.id);
        }
      }
      if (affectedRoots.size === 0) return;

      // This client is now the most recent editor of every root it just touched.
      setLastEditedByRoot((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const rootId of affectedRoots.values()) {
          if (next.delete(rootId)) changed = true;
        }
        return changed ? next : prev;
      });

      const clientId = clientIdRef.current;
      for (const [token, rootId] of affectedRoots) {
        scheduleSaveForRoot(rootId, token);
        const bundle = channelsRef.current.get(token);
        if (bundle) broadcastOnBundle(bundle, clientId, action);
      }
    },
    [enabled, scheduleSaveForRoot],
  );

  const flushAll = useCallback(() => {
    const clientId = clientIdRef.current;
    for (const bundle of channelsRef.current.values()) {
      flushBundleText(bundle, clientId);
      const subtree = extractSharedSubtree(treeRef.current, bundle.rootId);
      if (subtree.length > 0) {
        void persistDocument(bundle.shareToken, subtree).catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onBeforeUnload = () => flushAll();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [enabled, flushAll]);

  return { broadcastSubtreeAction, lastEditedByRoot };
}
