import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { node } from '../test/factories';
import { makeFakeChannel, type FakeChannel } from '../test/fakeSupabaseChannel';
import type { AppAction, BulletNode } from '../state/types';
import { useSharedSubtreeSync } from './useSharedSubtreeSync';
import { SAVE_DEBOUNCE_MS } from './syncTypes';
import { supabase } from '../lib/supabase';
import { persistDocument } from './documentApi';

const createdChannels: FakeChannel[] = [];

// src/test/setup.ts globally stubs this hook for tests that don't care about it —
// undo that here since this file exercises the real implementation.
vi.unmock('./useSharedSubtreeSync');

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: { channel: vi.fn(), removeChannel: vi.fn() },
}));

vi.mock('./documentApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./documentApi')>()),
  persistDocument: vi.fn(),
}));

// `restoreMocks: true` (vite.config.ts) wipes vi.fn() implementations before every test,
// so they must be re-established here rather than once in the vi.mock factories above.
beforeEach(() => {
  createdChannels.length = 0;
  vi.mocked(supabase.channel).mockImplementation(() => {
    const ch = makeFakeChannel();
    createdChannels.push(ch);
    return ch as unknown as ReturnType<typeof supabase.channel>;
  });
  vi.mocked(supabase.removeChannel).mockResolvedValue({ status: 'ok', error: null });
  vi.mocked(persistDocument).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

function renderSync(tree: BulletNode[]) {
  return renderHook(() => useSharedSubtreeSync({ tree, enabled: true, userId: 'owner-1', displayName: 'Owner', onRemoteAction: () => {} }));
}

describe('useSharedSubtreeSync reconnect', () => {
  it('schedules a reconnect after CHANNEL_ERROR: creates a new channel, removes the old one', () => {
    const tree = [node('root', [], { shareToken: 'tok' })];
    const { unmount } = renderSync(tree);

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
      useSharedSubtreeSync({ tree, enabled: true, userId: 'owner-1', displayName: 'Owner', onRemoteAction: () => {} }),
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

  it('resumes scheduled saves once reconnected and a genuine local edit occurs', () => {
    const tree = [node('root', [], { shareToken: 'tok', text: 'before' })];
    const { result, rerender, unmount } = renderHook(
      ({ tree }) => useSharedSubtreeSync({ tree, enabled: true, userId: 'owner-1', displayName: 'Owner', onRemoteAction: () => {} }),
      { initialProps: { tree } },
    );
    const first = createdChannels[0]!;
    vi.useFakeTimers();
    act(() => first._emitStatus!('CHANNEL_ERROR'));
    act(() => vi.advanceTimersByTime(1500));
    const second = createdChannels[1]!;
    act(() => second._emitStatus!('SUBSCRIBED'));

    // Only a genuinely local edit — via broadcastSubtreeAction, never a bare tree-prop
    // change — schedules a save (see useDocumentSync.test.ts for why: a save effect that
    // merely watched `tree` couldn't tell a local edit apart from a remote one just
    // applied locally). Confirm that still works correctly after a reconnect cycle.
    const editedTree = [node('root', [], { shareToken: 'tok', text: 'after' })];
    rerender({ tree: editedTree });
    act(() => result.current.broadcastSubtreeAction({ type: 'TOGGLE_COMPLETE', id: 'root' } as AppAction));
    act(() => vi.advanceTimersByTime(SAVE_DEBOUNCE_MS));
    expect(vi.mocked(persistDocument)).toHaveBeenCalledWith('tok', expect.anything());

    unmount();
  });

  it('keeps retrying cleanly across repeated failures', () => {
    const tree = [node('root', [], { shareToken: 'tok' })];
    const { unmount } = renderSync(tree);

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
    const { unmount } = renderSync(tree);

    vi.useFakeTimers();
    act(() => createdChannels[0]!._emitStatus!('CHANNEL_ERROR'));
    unmount();
    act(() => vi.advanceTimersByTime(5000));
    expect(createdChannels).toHaveLength(1); // reconnect never fired after teardown
  });

  it('one root erroring/reconnecting does not affect an independent root', () => {
    const tree = [node('a', [], { shareToken: 'tokA' }), node('b', [], { shareToken: 'tokB' })];
    const { unmount } = renderSync(tree);
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
