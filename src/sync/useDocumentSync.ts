import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { AppAction, BulletNode } from '../state/types';
import { fetchDocument, parseBroadcastMessage, persistDocument } from './documentApi';
import { recordShareOpen } from './sharedWithMeApi';
import {
  isSyncableAction,
  SAVE_DEBOUNCE_MS,
  TEXT_BROADCAST_MS,
  type BroadcastMessage,
  type SyncConnectionStatus,
} from './syncTypes';

export { createSharedDocument } from './documentApi';

export type PresenceInfo = { clientId: string; displayName: string; editingId: string | null };

type UseDocumentSyncOptions = {
  shareToken: string;
  tree: BulletNode[];
  enabled: boolean;
  displayName: string;
  editingId: string | null;
  onRemoteAction: (action: AppAction) => void;
  onHydrate: (tree: BulletNode[]) => void;
};

export function useDocumentSync({
  shareToken,
  tree,
  enabled,
  displayName,
  editingId,
  onRemoteAction,
  onHydrate,
}: UseDocumentSyncOptions) {
  const clientIdRef = useRef(crypto.randomUUID());
  const [status, setStatus] = useState<SyncConnectionStatus>(enabled ? 'loading' : 'idle');
  const [hydrated, setHydrated] = useState(false);
  const [otherEditors, setOtherEditors] = useState(0);
  const [otherPresences, setOtherPresences] = useState<PresenceInfo[]>([]);
  const [permission, setPermission] = useState<'edit' | 'view'>('edit');
  const displayNameRef = useRef(displayName);
  const editingIdRef = useRef(editingId);
  useEffect(() => {
    displayNameRef.current = displayName;
    editingIdRef.current = editingId;
  });

  // Reset to 'loading' synchronously during render (not in an effect) when the fetch
  // inputs change, per React's "adjusting state on prop change" pattern — avoids an
  // extra render where status/hydrated would briefly be stale.
  const fetchKey = `${enabled}:${shareToken}`;
  const [prevFetchKey, setPrevFetchKey] = useState(fetchKey);
  if (fetchKey !== prevFetchKey) {
    setPrevFetchKey(fetchKey);
    if (enabled && shareToken && isSupabaseConfigured()) {
      setStatus('loading');
      setHydrated(false);
    }
  }
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);
  const textTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingTextRef = useRef<Map<string, string>>(new Map());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const treeRef = useRef(tree);
  const shareTokenRef = useRef(shareToken);
  const onRemoteActionRef = useRef(onRemoteAction);
  const onHydrateRef = useRef(onHydrate);
  useEffect(() => {
    treeRef.current = tree;
    shareTokenRef.current = shareToken;
    onRemoteActionRef.current = onRemoteAction;
    onHydrateRef.current = onHydrate;
  });

  const broadcastNow = useCallback(async (action: AppAction) => {
    const channel = channelRef.current;
    if (!channel || !subscribedRef.current) return;
    const payload: BroadcastMessage = {
      source: clientIdRef.current,
      action,
      ts: Date.now(),
    };
    try {
      await channel.send({ type: 'broadcast', event: 'action', payload });
    } catch {
      subscribedRef.current = false;
      setStatus('reconnecting');
    }
  }, []);

  const flushPendingText = useCallback(() => {
    for (const timer of textTimersRef.current.values()) clearTimeout(timer);
    textTimersRef.current.clear();
    for (const [id, text] of pendingTextRef.current.entries()) {
      void broadcastNow({ type: 'SET_TEXT', id, text });
    }
    pendingTextRef.current.clear();
  }, [broadcastNow]);

  const broadcastAction = useCallback(
    (action: AppAction) => {
      if (!enabled || !isSyncableAction(action)) return;

      if (action.type === 'SET_TEXT') {
        pendingTextRef.current.set(action.id, action.text);
        const existing = textTimersRef.current.get(action.id);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          textTimersRef.current.delete(action.id);
          const text = pendingTextRef.current.get(action.id);
          if (text === undefined) return;
          pendingTextRef.current.delete(action.id);
          void broadcastNow({ type: 'SET_TEXT', id: action.id, text });
        }, TEXT_BROADCAST_MS);
        textTimersRef.current.set(action.id, timer);
        return;
      }

      flushPendingText();
      void broadcastNow(action);
    },
    [broadcastNow, enabled, flushPendingText],
  );

  const flushSave = useCallback(() => {
    if (!enabled || !isSupabaseConfigured()) return;
    void persistDocument(shareTokenRef.current, treeRef.current).catch(() => {
      setStatus('error');
    });
  }, [enabled]);

  const flushPendingTextRef = useRef(flushPendingText);
  const flushSaveRef = useRef(flushSave);
  useEffect(() => {
    flushPendingTextRef.current = flushPendingText;
    flushSaveRef.current = flushSave;
  });

  const scheduleSave = useCallback(() => {
    if (!enabled || !subscribedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      flushSave();
    }, SAVE_DEBOUNCE_MS);
  }, [enabled, flushSave]);

  useEffect(() => {
    if (!enabled || !shareToken || !isSupabaseConfigured()) return;

    let cancelled = false;

    void (async () => {
      try {
        const doc = await fetchDocument(shareToken);
        if (cancelled) return;
        if (!doc) {
          setStatus('error');
          return;
        }
        onHydrateRef.current(doc.tree);
        setPermission(doc.permission ?? 'edit');
        setHydrated(true);
        void recordShareOpen(shareToken).catch(() => {});
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, shareToken]);

  useEffect(() => {
    if (!enabled || !shareToken || !hydrated || !isSupabaseConfigured()) return;

    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let channel: RealtimeChannel | null = null;
    const textTimers = textTimersRef.current;
    const pendingText = pendingTextRef.current;

    const teardownChannel = async () => {
      subscribedRef.current = false;
      if (channel) {
        await supabase.removeChannel(channel);
        channel = null;
        channelRef.current = null;
      }
    };

    const connect = () => {
      if (cancelled) return;

      void teardownChannel().then(() => {
        if (cancelled) return;

        channel = supabase.channel(`doc:${shareToken}`, {
          config: {
            broadcast: { self: false },
            presence: { key: clientIdRef.current },
          },
        });

        channel
          .on('broadcast', { event: 'action' }, (raw) => {
            const msg = parseBroadcastMessage(raw);
            if (!msg || msg.source === clientIdRef.current) return;
            onRemoteActionRef.current(msg.action);
          })
          .on('presence', { event: 'sync' }, () => {
            if (!channel) return;
            const presenceState = channel.presenceState<PresenceInfo>();
            const all = Object.values(presenceState).flat();
            const others = all.filter((p) => p.clientId !== clientIdRef.current);
            setOtherEditors(others.length);
            setOtherPresences(others);
          })
          .subscribe((subscribeStatus) => {
            if (subscribeStatus === 'SUBSCRIBED') {
              subscribedRef.current = true;
              channelRef.current = channel;
              setStatus('connected');
              void channel!.track({
                clientId: clientIdRef.current,
                displayName: displayNameRef.current,
                editingId: editingIdRef.current,
              } satisfies PresenceInfo);
            } else if (subscribeStatus === 'CHANNEL_ERROR' || subscribeStatus === 'TIMED_OUT') {
              subscribedRef.current = false;
              setStatus('reconnecting');
              if (!cancelled) {
                reconnectTimer = setTimeout(connect, 1500);
              }
            } else if (subscribeStatus === 'CLOSED') {
              subscribedRef.current = false;
              if (!cancelled) {
                setStatus('reconnecting');
                reconnectTimer = setTimeout(connect, 1500);
              }
            }
          });
      });
    };

    connect();

    const onBeforeUnload = () => {
      flushPendingTextRef.current();
      flushSaveRef.current();
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      cancelled = true;
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      for (const timer of textTimers.values()) clearTimeout(timer);
      textTimers.clear();
      pendingText.clear();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      void teardownChannel();
    };
  }, [enabled, hydrated, shareToken]);

  useEffect(() => {
    if (!enabled || status !== 'connected') return;
    scheduleSave();
  }, [enabled, scheduleSave, status, tree]);

  // Re-broadcast presence (display name + which bullet is being edited) whenever
  // either changes, so peers see up-to-date attribution without a full reconnect.
  useEffect(() => {
    if (!enabled || status !== 'connected' || !subscribedRef.current) return;
    const channel = channelRef.current;
    if (!channel) return;
    void channel.track({
      clientId: clientIdRef.current,
      displayName,
      editingId,
    } satisfies PresenceInfo);
  }, [enabled, status, displayName, editingId]);

  return { status, otherEditors, otherPresences, permission, broadcastAction, flushSave };
}
