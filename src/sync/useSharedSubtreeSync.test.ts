import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { node } from '../test/factories';
import type { AppAction } from '../state/types';
import { useSharedSubtreeSync } from './useSharedSubtreeSync';
import { SAVE_DEBOUNCE_MS } from './syncTypes';
import { supabase } from '../lib/supabase';
import { persistDocument } from './documentApi';

type FakeChannel = {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  track: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  _emitStatus?: (status: string) => void;
};

const createdChannels: FakeChannel[] = [];

function makeFakeChannel(): FakeChannel {
  const channel: FakeChannel = {
    on: vi.fn(),
    subscribe: vi.fn(),
    track: vi.fn().mockResolvedValue('ok'),
    send: vi.fn().mockResolvedValue('ok'),
  };
  channel.on.mockImplementation(() => channel);
  channel.subscribe.mockImplementation((cb: (status: string) => void) => {
    channel._emitStatus = cb;
    cb('SUBSCRIBED'); // simulate an instant handshake by default; tests can still fire other statuses later
    return channel;
  });
  return channel;
}

// src/test/setup.ts globally stubs this hook for tests that don't care about it —
// undo that here since this file exercises the real implementation.
vi.unmock('./useSharedSubtreeSync');

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: { channel: vi.fn(), removeChannel: vi.fn() },
}));

vi.mock('./documentApi', () => ({
  persistDocument: vi.fn(),
  parseBroadcastMessage: vi.fn(),
}));

// `restoreMocks: true` (vite.config.ts) wipes vi.fn() implementations before every test,
// so they must be re-established here rather than once in the vi.mock factories above.
beforeEach(async () => {
  createdChannels.length = 0;
  vi.mocked(supabase.channel).mockImplementation(() => {
    const ch = makeFakeChannel();
    createdChannels.push(ch);
    return ch as unknown as ReturnType<typeof supabase.channel>;
  });
  vi.mocked(supabase.removeChannel).mockResolvedValue({ status: 'ok', error: null });
  vi.mocked(persistDocument).mockResolvedValue(undefined);
  const { parseBroadcastMessage } = await import('./documentApi');
  vi.mocked(parseBroadcastMessage).mockImplementation((raw: unknown) => {
    const envelope = raw as { payload?: unknown } | null;
    const inner = envelope && typeof envelope === 'object' && 'payload' in envelope ? envelope.payload : envelope;
    const msg = inner as { action?: unknown; source?: unknown } | null;
    if (!msg?.action || typeof msg.source !== 'string') return null;
    return msg as ReturnType<typeof parseBroadcastMessage>;
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSharedSubtreeSync reconnect', () => {
  it('schedules a reconnect after CHANNEL_ERROR: creates a new channel, removes the old one', () => {
    const tree = [node('root', [], { shareToken: 'tok' })];
    const { unmount } = renderHook(() => useSharedSubtreeSync({ tree, enabled: true, onRemoteAction: () => {} }));

    expect(createdChannels).toHaveLength(1);
    const first = createdChannels[0]!;

    vi.useFakeTimers();
    act(() => first._emitStatus!('CHANNEL_ERROR'));
    expect(createdChannels).toHaveLength(1); // not yet — reconnect is delayed

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(createdChannels).toHaveLength(2);
    expect(vi.mocked(supabase.removeChannel)).toHaveBeenCalledWith(first);

    unmount();
  });

  it('resumes broadcasting on the new channel after a successful reconnect', () => {
    const tree = [node('root', [], { shareToken: 'tok' })];
    const { result, unmount } = renderHook(() =>
      useSharedSubtreeSync({ tree, enabled: true, onRemoteAction: () => {} }),
    );
    const first = createdChannels[0]!;
    vi.useFakeTimers();
    act(() => first._emitStatus!('CHANNEL_ERROR'));
    act(() => vi.advanceTimersByTime(1500));
    const second = createdChannels[1]!;
    act(() => second._emitStatus!('SUBSCRIBED'));

    act(() => {
      result.current.broadcastSubtreeAction({ type: 'TOGGLE_COMPLETE', id: 'root' } as AppAction);
    });
    expect(second.send).toHaveBeenCalled();
    expect(first.send).not.toHaveBeenCalled();

    unmount();
  });

  it('resumes scheduled saves once reconnected and a real tree change occurs', () => {
    const tree = [node('root', [], { shareToken: 'tok', text: 'before' })];
    const { rerender, unmount } = renderHook(
      ({ tree }) => useSharedSubtreeSync({ tree, enabled: true, onRemoteAction: () => {} }),
      { initialProps: { tree } },
    );
    const first = createdChannels[0]!;
    vi.useFakeTimers();
    act(() => first._emitStatus!('CHANNEL_ERROR'));
    act(() => vi.advanceTimersByTime(1500));
    const second = createdChannels[1]!;
    act(() => second._emitStatus!('SUBSCRIBED'));

    // A tree edit rebuilds `sharedRoots`'s array reference, which — independent of this
    // fix — makes the channel-management effect tear down and recreate the bundle each
    // time (a pre-existing characteristic of this hook, not part of Bug D). Confirm the
    // fresh bundle it creates comes back up and can still schedule a save once subscribed.
    const editedTree = [node('root', [], { shareToken: 'tok', text: 'after' })];
    rerender({ tree: editedTree });
    expect(createdChannels.length).toBeGreaterThanOrEqual(2);
    const third = createdChannels[createdChannels.length - 1]!;
    act(() => third._emitStatus!('SUBSCRIBED'));
    act(() => vi.advanceTimersByTime(SAVE_DEBOUNCE_MS));
    expect(vi.mocked(persistDocument)).toHaveBeenCalledWith('tok', expect.anything());

    unmount();
  });

  it('keeps retrying cleanly across repeated failures', () => {
    const tree = [node('root', [], { shareToken: 'tok' })];
    const { unmount } = renderHook(() => useSharedSubtreeSync({ tree, enabled: true, onRemoteAction: () => {} }));

    vi.useFakeTimers();
    act(() => createdChannels[0]!._emitStatus!('CHANNEL_ERROR'));
    act(() => vi.advanceTimersByTime(1500));
    expect(createdChannels).toHaveLength(2);

    act(() => createdChannels[1]!._emitStatus!('TIMED_OUT'));
    act(() => vi.advanceTimersByTime(1500));
    expect(createdChannels).toHaveLength(3);

    act(() => createdChannels[2]!._emitStatus!('SUBSCRIBED'));
    expect(createdChannels).toHaveLength(3); // healthy now, no further reconnects

    unmount();
  });

  it('cancels a pending reconnect on teardown', () => {
    const tree = [node('root', [], { shareToken: 'tok' })];
    const { unmount } = renderHook(() => useSharedSubtreeSync({ tree, enabled: true, onRemoteAction: () => {} }));

    vi.useFakeTimers();
    act(() => createdChannels[0]!._emitStatus!('CHANNEL_ERROR'));
    unmount();
    act(() => vi.advanceTimersByTime(5000));
    expect(createdChannels).toHaveLength(1); // reconnect never fired after teardown
  });

  it('one root erroring/reconnecting does not affect an independent root', () => {
    const tree = [node('a', [], { shareToken: 'tokA' }), node('b', [], { shareToken: 'tokB' })];
    const { unmount } = renderHook(() => useSharedSubtreeSync({ tree, enabled: true, onRemoteAction: () => {} }));
    expect(createdChannels).toHaveLength(2);
    const [chanA, chanB] = createdChannels as [FakeChannel, FakeChannel];

    vi.useFakeTimers();
    act(() => chanB._emitStatus!('SUBSCRIBED'));
    act(() => chanA._emitStatus!('CHANNEL_ERROR'));
    act(() => vi.advanceTimersByTime(1500));

    expect(createdChannels).toHaveLength(3); // a reconnected
    expect(vi.mocked(supabase.removeChannel)).not.toHaveBeenCalledWith(chanB);

    unmount();
  });
});
