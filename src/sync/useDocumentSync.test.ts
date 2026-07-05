import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { node } from '../test/factories';
import { makeFakeChannel } from '../test/fakeSupabaseChannel';
import { supabase } from '../lib/supabase';
import { fetchDocument, persistDocument } from './documentApi';
import { useDocumentSync } from './useDocumentSync';
import { SAVE_DEBOUNCE_MS } from './syncTypes';

// src/test/setup.ts globally stubs this hook for tests that don't care about it —
// undo that here since this file exercises the real implementation.
vi.unmock('./useDocumentSync');

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: { channel: vi.fn(), removeChannel: vi.fn() },
}));

vi.mock('./documentApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./documentApi')>()),
  fetchDocument: vi.fn(),
  persistDocument: vi.fn(),
  parseBroadcastMessage: vi.fn(),
}));

vi.mock('./sharedWithMeApi', () => ({
  recordShareOpen: vi.fn().mockResolvedValue(undefined),
}));

const baseTree = () => [node('root', [], { shareToken: 'tok' })];

// `restoreMocks: true` (vite.config.ts) wipes vi.fn() implementations before every test,
// so they must be re-established here rather than once in the vi.mock factories above.
beforeEach(() => {
  vi.mocked(supabase.channel).mockImplementation(
    () => makeFakeChannel() as unknown as ReturnType<typeof supabase.channel>,
  );
  vi.mocked(supabase.removeChannel).mockResolvedValue({ status: 'ok', error: null });
  vi.mocked(persistDocument).mockResolvedValue(undefined);
  vi.mocked(fetchDocument).mockResolvedValue({
    id: 'doc-1',
    tree: baseTree(),
    revoked: false,
    user_id: 'owner-1',
    permission: 'edit',
    updated_at: '2024-01-01T00:00:00Z',
    share_token: 'tok',
  });
});

type SyncProps = Parameters<typeof useDocumentSync>[0];

/**
 * Renders the hook the way the real app does: `onHydrate` feeds the fetched tree back
 * into props on the next render (mirroring AppStateProvider dispatching HYDRATE and
 * re-rendering with `state.tree`), so the hook's `tree` prop becomes reference-equal to
 * what it just fetched — the exact invariant Fix 6a's guard depends on.
 */
function renderConnected(overrides: Partial<SyncProps> = {}) {
  let rerenderFn: ((props: SyncProps) => void) | null = null;
  const initialProps: SyncProps = {
    shareToken: 'tok',
    tree: baseTree(),
    enabled: true,
    displayName: 'Tester',
    editingId: null,
    onRemoteAction: () => {},
    onHydrate: (hydrated) => {
      rerenderFn?.({ ...initialProps, tree: hydrated });
    },
    ...overrides,
  };
  const utils = renderHook((p: SyncProps) => useDocumentSync(p), { initialProps });
  rerenderFn = utils.rerender;
  return { ...utils, initialProps };
}

/** Simulates a local edit: re-renders with the same props but a new `tree` reference. */
function rerenderWithTree(
  rerender: (props: SyncProps) => void,
  initialProps: SyncProps,
  tree: SyncProps['tree'],
) {
  rerender({ ...initialProps, tree });
}

describe('useDocumentSync', () => {
  it('does not resave the just-hydrated tree merely because the connection came up', async () => {
    vi.useFakeTimers();
    renderConnected();
    await act(async () => {});
    act(() => vi.advanceTimersByTime(SAVE_DEBOUNCE_MS));
    expect(vi.mocked(persistDocument)).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('never attempts a save while permission is view-only', async () => {
    vi.mocked(fetchDocument).mockResolvedValue({
      id: 'doc-1',
      tree: baseTree(),
      revoked: false,
      user_id: 'owner-1',
      permission: 'view',
      updated_at: '2024-01-01T00:00:00Z',
      share_token: 'tok',
    });
    vi.useFakeTimers();
    const { result, rerender, initialProps } = renderConnected();
    await act(async () => {});
    expect(result.current.permission).toBe('view');

    rerenderWithTree(rerender, initialProps, [node('root', [], { shareToken: 'tok', text: 'edited' })]);
    act(() => vi.advanceTimersByTime(SAVE_DEBOUNCE_MS));
    expect(vi.mocked(persistDocument)).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('still saves a genuine edit after the debounce', async () => {
    vi.useFakeTimers();
    const { rerender, initialProps } = renderConnected();
    await act(async () => {});

    const editedTree = [node('root', [], { shareToken: 'tok', text: 'edited' })];
    rerenderWithTree(rerender, initialProps, editedTree);
    act(() => vi.advanceTimersByTime(SAVE_DEBOUNCE_MS));
    expect(vi.mocked(persistDocument)).toHaveBeenCalledWith('tok', editedTree);
    vi.useRealTimers();
  });

  it('flips permission to view (not a fatal error) when a save is rejected as view-only', async () => {
    vi.useFakeTimers();
    vi.mocked(persistDocument).mockRejectedValue(
      Object.assign(new Error('This document is view-only or no longer shared'), { code: 'P0001' }),
    );
    const { result, rerender, initialProps } = renderConnected();
    await act(async () => {});

    rerenderWithTree(rerender, initialProps, [node('root', [], { shareToken: 'tok', text: 'edited' })]);
    act(() => vi.advanceTimersByTime(SAVE_DEBOUNCE_MS));
    await act(async () => {});

    expect(result.current.permission).toBe('view');
    expect(result.current.status).toBe('connected');
    vi.useRealTimers();
  });

  it('sets status to error for an unrelated save rejection', async () => {
    vi.useFakeTimers();
    vi.mocked(persistDocument).mockRejectedValue(new Error('network boom'));
    const { result, rerender, initialProps } = renderConnected();
    await act(async () => {});

    rerenderWithTree(rerender, initialProps, [node('root', [], { shareToken: 'tok', text: 'edited' })]);
    act(() => vi.advanceTimersByTime(SAVE_DEBOUNCE_MS));
    await act(async () => {});

    expect(result.current.status).toBe('error');
    vi.useRealTimers();
  });

  it('sets status to error when the initial fetch finds no document', async () => {
    vi.mocked(fetchDocument).mockResolvedValue(null);
    const { result } = renderConnected();
    await act(async () => {});
    expect(result.current.status).toBe('error');
  });
});
