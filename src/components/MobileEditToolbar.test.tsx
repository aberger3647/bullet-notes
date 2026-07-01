import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { MobileEditToolbar } from './MobileEditToolbar';
import { renderWithContext, makeState } from '../test/renderWithContext';
import { node } from '../test/factories';

describe('MobileEditToolbar', () => {
  it('renders nothing when no bullet is being edited', () => {
    const { container } = renderWithContext(<MobileEditToolbar />, {
      state: makeState([node('a')]),
      editingBulletId: null,
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('indents the editing bullet and expands its new parent', () => {
    const ensureExpanded = vi.fn();
    const { value } = renderWithContext(<MobileEditToolbar />, {
      state: makeState([node('a'), node('b')]),
      editingBulletId: 'b',
      ensureExpanded,
    });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Indent' }));
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'INDENT', id: 'b' });
    expect(ensureExpanded).toHaveBeenCalledWith('a');
  });

  it('disables indent for a first sibling and outdent for a root-level bullet', () => {
    renderWithContext(<MobileEditToolbar />, {
      state: makeState([node('a'), node('b')]),
      editingBulletId: 'a',
    });
    expect(screen.getByRole('button', { name: 'Indent' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Outdent' })).toBeDisabled();
  });

  it('outdents a nested bullet', () => {
    const { value } = renderWithContext(<MobileEditToolbar />, {
      state: makeState([node('a', [node('a1')])]),
      editingBulletId: 'a1',
    });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Outdent' }));
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'OUTDENT', id: 'a1' });
  });

  it('toggles completion', () => {
    const { value } = renderWithContext(<MobileEditToolbar />, {
      state: makeState([node('a')]),
      editingBulletId: 'a',
    });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Mark complete' }));
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_COMPLETE', id: 'a' });
  });

  it('shares via gesture when there is no pending token', () => {
    const shareNodeFromGesture = vi.fn().mockResolvedValue(undefined);
    renderWithContext(<MobileEditToolbar />, {
      state: makeState([node('a')]),
      editingBulletId: 'a',
      shareNodeFromGesture,
    });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Share' }));
    expect(shareNodeFromGesture).toHaveBeenCalledWith('a');
  });
});
