import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { SharedWithMeSection } from './SharedWithMeSection';
import { renderWithContext, makeState } from '../test/renderWithContext';
import { node } from '../test/factories';
import type { SharedWithMeItem } from '../sync/sharedWithMeApi';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

let listState: {
  items: SharedWithMeItem[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: boolean;
} = { items: [], loading: false, loadingMore: false, hasMore: false, error: false };
const loadMoreMock = vi.fn().mockResolvedValue(undefined);
const useSharedWithMeListMock = vi.fn((enabled: boolean) => ({
  ...listState,
  enabled,
  loadMore: loadMoreMock,
}));
vi.mock('../sync/useSharedWithMeList', () => ({
  useSharedWithMeList: (enabled: boolean) => useSharedWithMeListMock(enabled),
}));

function item(overrides: Partial<SharedWithMeItem> = {}): SharedWithMeItem {
  return {
    share_token: 'tok-1',
    revoked: false,
    updated_at: '2026-07-01T00:00:00Z',
    permission: 'edit',
    last_opened_at: '2026-07-02T00:00:00Z',
    owner_name: 'Jamie',
    ...overrides,
  };
}

describe('SharedWithMeSection', () => {
  beforeEach(() => {
    listState = { items: [], loading: false, loadingMore: false, hasMore: false, error: false };
    navigateMock.mockClear();
    loadMoreMock.mockClear();
    useSharedWithMeListMock.mockClear();
    localStorage.clear();
  });

  it('renders nothing when there are no shared notes', () => {
    const { container } = renderWithContext(<SharedWithMeSection />, { state: makeState([node('a')]) });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while the initial fetch is loading', () => {
    listState = { ...listState, loading: true };
    const { container } = renderWithContext(<SharedWithMeSection />, { state: makeState([node('a')]) });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing on error', () => {
    listState = { ...listState, error: true, items: [item()] };
    const { container } = renderWithContext(<SharedWithMeSection />, { state: makeState([node('a')]) });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when zoomed into a bullet', () => {
    listState = { ...listState, items: [item()] };
    const { container } = renderWithContext(<SharedWithMeSection />, {
      state: makeState([node('a')], { zoomPath: ['a'] }),
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while viewing a shared document', () => {
    listState = { ...listState, items: [item()] };
    const { container } = renderWithContext(<SharedWithMeSection />, {
      state: makeState([node('a')]),
      mode: 'shared',
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('does not fetch while zoomed in or viewing a shared document', () => {
    renderWithContext(<SharedWithMeSection />, { state: makeState([node('a')], { zoomPath: ['a'] }) });
    expect(useSharedWithMeListMock).toHaveBeenCalledWith(false);
  });

  it('shows a collapsed header with no "new" count when nothing changed', () => {
    listState = { ...listState, items: [item({ updated_at: '2026-07-01T00:00:00Z', last_opened_at: '2026-07-02T00:00:00Z' })] };
    renderWithContext(<SharedWithMeSection />, { state: makeState([node('a')]) });
    const header = screen.getByRole('button', { name: 'Shared with me' });
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('list', { name: 'Shared with me' })).not.toBeInTheDocument();
  });

  it('includes a new count in the header label when the owner edited since last view', () => {
    listState = {
      ...listState,
      items: [item({ updated_at: '2026-07-03T00:00:00Z', last_opened_at: '2026-07-02T00:00:00Z' })],
    };
    renderWithContext(<SharedWithMeSection />, { state: makeState([node('a')]) });
    expect(screen.getByRole('button', { name: 'Shared with me — 1 new' })).toBeInTheDocument();
  });

  it('expands to reveal items on click', () => {
    listState = { ...listState, items: [item({ owner_name: 'Jamie' })] };
    renderWithContext(<SharedWithMeSection />, { state: makeState([node('a')]) });
    fireEvent.click(screen.getByRole('button', { name: 'Shared with me' }));
    expect(screen.getByRole('list', { name: 'Shared with me' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open note shared by Jamie' })).toBeInTheDocument();
  });

  it('falls back to "Someone" when the owner has no display name', () => {
    listState = { ...listState, items: [item({ owner_name: null })] };
    renderWithContext(<SharedWithMeSection />, { state: makeState([node('a')]) });
    fireEvent.click(screen.getByRole('button', { name: 'Shared with me' }));
    expect(screen.getByRole('button', { name: 'Open note shared by Someone' })).toBeInTheDocument();
  });

  it('navigates to the shared document when an item is clicked', () => {
    listState = { ...listState, items: [item({ owner_name: 'Jamie', share_token: 'abc123' })] };
    renderWithContext(<SharedWithMeSection />, { state: makeState([node('a')]) });
    fireEvent.click(screen.getByRole('button', { name: 'Shared with me' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open note shared by Jamie' }));
    expect(navigateMock).toHaveBeenCalledWith('/d/abc123');
  });

  it('shows a Load more button when there are more pages, wired to loadMore', () => {
    listState = { ...listState, items: [item()], hasMore: true };
    renderWithContext(<SharedWithMeSection />, { state: makeState([node('a')]) });
    fireEvent.click(screen.getByRole('button', { name: 'Shared with me' }));
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(loadMoreMock).toHaveBeenCalled();
  });

  it('persists the expanded state across remounts', () => {
    listState = { ...listState, items: [item()] };
    const { unmount } = renderWithContext(<SharedWithMeSection />, { state: makeState([node('a')]) });
    fireEvent.click(screen.getByRole('button', { name: 'Shared with me' }));
    unmount();

    renderWithContext(<SharedWithMeSection />, { state: makeState([node('a')]) });
    expect(screen.getByRole('button', { name: 'Shared with me' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('does not let "Expand all"/"Collapse all" affect its own collapse state', () => {
    listState = { ...listState, items: [item()] };
    localStorage.setItem('bullet-notes:v1:expanded', JSON.stringify(['a']));
    renderWithContext(<SharedWithMeSection />, { state: makeState([node('a')]) });
    expect(screen.getByRole('button', { name: 'Shared with me' })).toHaveAttribute('aria-expanded', 'false');
  });
});
