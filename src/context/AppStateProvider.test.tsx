import { describe, it, expect } from 'vitest';
import { act, screen } from '@testing-library/react';
import { renderWithProvider } from '../test/renderWithProvider';
import { node } from '../test/factories';
import type { PersistedState } from '../state/types';

const seed = (tree: PersistedState['tree']): PersistedState => ({
  tree,
  zoomPath: [],
  settings: { hideCompleted: false, theme: 'light' },
});

describe('AppStateProvider persistence across reload', () => {
  it('persists expand/collapse across a remount (local mode)', () => {
    const first = renderWithProvider(<div />, { seed: seed([node('a', [node('b')])]) });
    act(() => first.getContext().toggleExpand('a'));
    expect(first.getContext().expanded.has('a')).toBe(true);
    first.unmount();

    const second = renderWithProvider(<div />, { seed: seed([node('a', [node('b')])]) });
    expect(second.getContext().expanded.has('a')).toBe(true);
  });

  it('keeps expand/collapse storage separate per shared document', () => {
    const first = renderWithProvider(<div />, {
      mode: 'shared',
      shareToken: 'tok-1',
      route: '/d/tok-1',
      seed: seed([node('a', [node('b')])]),
    });
    act(() => first.getContext().toggleExpand('a'));
    first.unmount();

    const other = renderWithProvider(<div />, {
      mode: 'shared',
      shareToken: 'tok-2',
      route: '/d/tok-2',
      seed: seed([node('a', [node('b')])]),
    });
    expect(other.getContext().expanded.has('a')).toBe(false);
  });

  it('persists undo history across a remount (local mode)', () => {
    const first = renderWithProvider(<div />, { seed: seed([node('a')]) });
    act(() => first.getContext().dispatch({ type: 'TOGGLE_COMPLETE', id: 'a' }));
    expect(first.getContext().state.history.past.length).toBeGreaterThan(0);
    first.unmount();

    const second = renderWithProvider(<div />, { seed: seed([node('a')]) });
    expect(second.getContext().state.history.past.length).toBeGreaterThan(0);
  });

  it('does not restore local undo history into a shared document', () => {
    const local = renderWithProvider(<div />, { seed: seed([node('a')]) });
    act(() => local.getContext().dispatch({ type: 'TOGGLE_COMPLETE', id: 'a' }));
    local.unmount();

    const shared = renderWithProvider(<div />, {
      mode: 'shared',
      shareToken: 'tok-3',
      route: '/d/tok-3',
      seed: seed([node('a')]),
    });
    expect(shared.getContext().state.history.past).toHaveLength(0);
  });
});

describe('AppStateProvider', () => {
  it('renders its children once sync reports a connected status', () => {
    renderWithProvider(<div>child content</div>);
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('reflects the theme setting onto the document element', () => {
    const { getContext } = renderWithProvider(<div />);
    act(() => getContext().dispatch({ type: 'SET_THEME', value: 'dark' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    act(() => getContext().dispatch({ type: 'SET_THEME', value: 'light' }));
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('suppresses UNDO/REDO in shared mode so peers stay in sync', () => {
    const { getContext } = renderWithProvider(<div />, {
      mode: 'shared',
      shareToken: 'tok',
      route: '/d/tok',
      seed: seed([node('a')]),
    });
    act(() => getContext().dispatch({ type: 'TOGGLE_COMPLETE', id: 'a' }));
    expect(getContext().state.tree[0]!.completed).toBe(true);

    // UNDO would normally revert the toggle, but it's a no-op in shared mode.
    act(() => getContext().dispatch({ type: 'UNDO' }));
    expect(getContext().state.tree[0]!.completed).toBe(true);
  });
});

describe('AppStateProvider selection', () => {
  it('selects a single bullet on the first selectRange call', () => {
    const { getContext } = renderWithProvider(<div />, { seed: seed([node('a'), node('b'), node('c')]) });
    act(() => getContext().selectRange('b'));
    expect(getContext().selectedIds).toEqual(new Set(['b']));
  });

  it('selects the contiguous range between the anchor and a later click, in either direction', () => {
    const { getContext } = renderWithProvider(<div />, {
      seed: seed([node('a'), node('b'), node('c'), node('d')]),
    });
    act(() => getContext().selectRange('b'));
    act(() => getContext().selectRange('d'));
    expect(getContext().selectedIds).toEqual(new Set(['b', 'c', 'd']));

    act(() => getContext().clearSelection());
    act(() => getContext().selectRange('d'));
    act(() => getContext().selectRange('b'));
    expect(getContext().selectedIds).toEqual(new Set(['b', 'c', 'd']));
  });

  it('extends the range correctly even when selectRange is called twice in the same synchronous batch (e.g. a drag gesture crossing two bullets in one event)', () => {
    const { getContext } = renderWithProvider(<div />, {
      seed: seed([node('a'), node('b'), node('c'), node('d')]),
    });
    act(() => {
      getContext().selectRange('a');
      getContext().selectRange('c');
    });
    expect(getContext().selectedIds).toEqual(new Set(['a', 'b', 'c']));
  });

  it('clearSelection empties the selection and resets the anchor', () => {
    const { getContext } = renderWithProvider(<div />, { seed: seed([node('a'), node('b')]) });
    act(() => getContext().selectRange('a'));
    act(() => getContext().clearSelection());
    expect(getContext().selectedIds.size).toBe(0);
    // A fresh selectRange after clearing starts a new anchor at the clicked id.
    act(() => getContext().selectRange('b'));
    expect(getContext().selectedIds).toEqual(new Set(['b']));
  });

  it('bulkToggleComplete marks the whole selection complete when any is incomplete, then clears selection', () => {
    const { getContext } = renderWithProvider(<div />, {
      seed: seed([node('a', [], { completed: true }), node('b'), node('c')]),
    });
    act(() => getContext().selectRange('a'));
    act(() => getContext().selectRange('c'));
    act(() => getContext().bulkToggleComplete());
    expect(getContext().state.tree.map((n) => n.completed)).toEqual([true, true, true]);
    expect(getContext().selectedIds.size).toBe(0);
  });

  it('bulkIndent nests the selected run under the preceding sibling, then clears selection', () => {
    const { getContext } = renderWithProvider(<div />, {
      seed: seed([node('a'), node('b'), node('c'), node('d')]),
    });
    act(() => getContext().selectRange('b'));
    act(() => getContext().selectRange('c'));
    act(() => getContext().bulkIndent());
    expect(getContext().state.tree.map((n) => n.id)).toEqual(['a', 'd']);
    expect(getContext().state.tree[0]!.children.map((n) => n.id)).toEqual(['b', 'c']);
    expect(getContext().selectedIds.size).toBe(0);
  });

  it('bulkOutdent lifts the selected run of children out to sibling level, then clears selection', () => {
    const { getContext } = renderWithProvider(<div />, {
      seed: seed([node('a', [node('b'), node('c'), node('d')]), node('e')]),
    });
    // b/c/d are only clickable (and thus selectable) once 'a' is expanded, same as real UI usage.
    act(() => getContext().toggleExpand('a'));
    act(() => getContext().selectRange('b'));
    act(() => getContext().selectRange('d'));
    act(() => getContext().bulkOutdent());
    expect(getContext().state.tree.map((n) => n.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(getContext().state.tree[0]!.children).toEqual([]);
    expect(getContext().selectedIds.size).toBe(0);
  });
});
