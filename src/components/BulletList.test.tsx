import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { BulletList } from './BulletList';
import { renderWithProvider } from '../test/renderWithProvider';
import { node } from '../test/factories';
import type { PersistedState } from '../state/types';

const seed = (tree: PersistedState['tree'], extra: Partial<PersistedState> = {}): PersistedState => ({
  tree,
  zoomPath: [],
  settings: { hideCompleted: false, theme: 'light' },
  ...extra,
});

describe('BulletList', () => {
  it('renders the visible top-level bullets', () => {
    renderWithProvider(<BulletList />, {
      seed: seed([node('a', [], { text: 'first' }), node('b', [], { text: 'second' })]),
    });
    expect(screen.getAllByRole('textbox', { name: 'Bullet text' })).toHaveLength(2);
  });

  it('hides completed bullets when the setting is on', () => {
    renderWithProvider(<BulletList />, {
      seed: seed([node('a', [], { text: 'open' }), node('b', [], { text: 'done', completed: true })], {
        settings: { hideCompleted: true, theme: 'light' },
      }),
    });
    expect(screen.getAllByRole('textbox', { name: 'Bullet text' })).toHaveLength(1);
  });

  it('reveals children only when the parent is expanded', () => {
    renderWithProvider(<BulletList />, {
      seed: seed([node('p', [node('c', [], { text: 'child' })], { text: 'parent' })]),
    });
    // Collapsed by default — only the parent row is present.
    expect(screen.getAllByRole('textbox', { name: 'Bullet text' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Expand sub-bullets' }));
    expect(screen.getAllByRole('textbox', { name: 'Bullet text' })).toHaveLength(2);
  });

  it('shows an empty-state message when the zoomed bullet has no children', () => {
    renderWithProvider(<BulletList />, {
      seed: seed([node('a', [], { text: 'leaf' })], { zoomPath: ['a'] }),
    });
    expect(screen.getByText('No bullets to show here.')).toBeInTheDocument();
  });
});
