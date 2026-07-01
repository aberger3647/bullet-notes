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
