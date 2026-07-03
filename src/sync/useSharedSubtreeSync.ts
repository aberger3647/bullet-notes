import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { AppAction, BulletNode } from '../state/types';
import {
  clampActionToSharedRoot,
  collectSharedRoots,
  extractSharedSubtree,
  getActionNodeIds,
  getShareRootsForNode,
} from '../state/treeOps';
import { parseBroadcastMessage, persistDocument } from './documentApi';
import {
  isSyncableAction,
  SAVE_DEBOUNCE_MS,
  TEXT_BROADCAST_MS,
  type BroadcastMessage,
} from './syncTypes';

type SharedRoot = { id: string; shareToken: string };

type ChannelBundle = {
  rootId: string;
  shareToken: string;
  channel: RealtimeChannel;
  subscribed: boolean;
  textTimers: Map<string, ReturnType<typeof setTimeout>>;
  pendingText: Map<string, string>;
  saveTimer: ReturnType<typeof setTimeout> | null;
};

type UseSharedSubtreeSyncOptions = {
  tree: BulletNode[];
  enabled: boolean;
  onRemoteAction: (action: AppAction) => void;
};

function createChannelBundle(
  root: SharedRoot,
  clientId: string,
  getTree: () => BulletNode[],
  onRemoteAction: (action: AppAction) => void,
  onSubscribedChange: (token: string, subscribed: boolean) => void,
): ChannelBundle {
  const bundle: ChannelBundle = {
    rootId: root.id,
    shareToken: root.shareToken,
    channel: supabase.channel(`doc:${root.shareToken}`, {
      config: {
        broadcast: { self: false },
        presence: { key: clientId },
      },
    }),
    subscribed: false,
    textTimers: new Map(),
    pendingText: new Map(),
    saveTimer: null,
  };

  bundle.channel
    .on('broadcast', { event: 'action' }, (raw) => {
      const msg = parseBroadcastMessage(raw);
      if (!msg || msg.source === clientId) return;
      const clamped = clampActionToSharedRoot(getTree(), msg.action, root.id);
      if (clamped) onRemoteAction(clamped);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        bundle.subscribed = true;
        onSubscribedChange(root.shareToken, true);
        void bundle.channel.track({ clientId });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        bundle.subscribed = false;
        onSubscribedChange(root.shareToken, false);
      }
    });

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
  for (const timer of bundle.textTimers.values()) clearTimeout(timer);
  bundle.textTimers.clear();
  bundle.pendingText.clear();
  if (bundle.saveTimer) clearTimeout(bundle.saveTimer);
  bundle.subscribed = false;
  await supabase.removeChannel(bundle.channel);
}

export function useSharedSubtreeSync({ tree, enabled, onRemoteAction }: UseSharedSubtreeSyncOptions) {
  const clientIdRef = useRef(crypto.randomUUID());
  const channelsRef = useRef<Map<string, ChannelBundle>>(new Map());
  const treeRef = useRef(tree);
  const onRemoteActionRef = useRef(onRemoteAction);
  useEffect(() => {
    treeRef.current = tree;
    onRemoteActionRef.current = onRemoteAction;
  });

  const sharedRoots = useMemo(() => collectSharedRoots(tree), [tree]);
  const sharedRootsKey = useMemo(
    () => sharedRoots.map((r) => `${r.id}:${r.shareToken}`).join(','),
    [sharedRoots],
  );

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured()) return;

    const clientId = clientIdRef.current;
    const current = channelsRef.current;
    const desiredTokens = new Set(sharedRoots.map((r) => r.shareToken));

    for (const [token, bundle] of current.entries()) {
      if (!desiredTokens.has(token)) {
        void teardownBundle(bundle);
        current.delete(token);
      }
    }

    for (const root of sharedRoots) {
      if (current.has(root.shareToken)) continue;
      const bundle = createChannelBundle(
        root,
        clientId,
        () => treeRef.current,
        (action) => onRemoteActionRef.current(action),
        () => {},
      );
      current.set(root.shareToken, bundle);
    }

    return () => {
      for (const bundle of current.values()) {
        void teardownBundle(bundle);
      }
      current.clear();
    };
  }, [enabled, sharedRootsKey, sharedRoots]);

  const scheduleSaves = useCallback(() => {
    if (!enabled) return;
    const roots = collectSharedRoots(treeRef.current);
    for (const root of roots) {
      const bundle = channelsRef.current.get(root.shareToken);
      if (!bundle?.subscribed) continue;
      if (bundle.saveTimer) clearTimeout(bundle.saveTimer);
      bundle.saveTimer = setTimeout(() => {
        bundle.saveTimer = null;
        const subtree = extractSharedSubtree(treeRef.current, root.id);
        if (subtree.length === 0) return;
        void persistDocument(root.shareToken, subtree).catch(() => {});
      }, SAVE_DEBOUNCE_MS);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    scheduleSaves();
  }, [enabled, scheduleSaves, tree, sharedRootsKey]);

  const broadcastSubtreeAction = useCallback(
    (action: AppAction) => {
      if (!enabled || !isSyncableAction(action)) return;

      const nodeIds = getActionNodeIds(action);
      const tokens = new Set<string>();
      for (const nodeId of nodeIds) {
        for (const root of getShareRootsForNode(treeRef.current, nodeId)) {
          tokens.add(root.shareToken);
        }
      }

      const clientId = clientIdRef.current;
      for (const token of tokens) {
        const bundle = channelsRef.current.get(token);
        if (bundle) broadcastOnBundle(bundle, clientId, action);
      }
    },
    [enabled],
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

  return { broadcastSubtreeAction };
}
