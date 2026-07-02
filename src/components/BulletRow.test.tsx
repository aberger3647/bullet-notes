import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import type { ReactElement } from 'react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { BulletRow } from './BulletRow';
import { renderWithContext, makeState } from '../test/renderWithContext';
import { withDeterministicUUID } from '../test/deterministicUuid';
import { node } from '../test/factories';
import type { BulletNode } from '../state/types';

/** BulletRow uses useSortable, which needs a Dnd + Sortable context ancestor. */
function inDnd(ui: ReactElement, itemIds: string[]): ReactElement {
  return (
    <DndContext>
      <SortableContext items={itemIds}>{ui}</SortableContext>
    </DndContext>
  );
}

function renderRow(node: BulletNode, props: Partial<Parameters<typeof BulletRow>[0]> = {}, ctx = {}) {
  return renderWithContext(
    inDnd(
      <BulletRow node={node} expanded={false} onToggleExpand={() => {}} {...props} />,
      [node.id],
    ),
    ctx,
  );
}

const editable = () => screen.getByRole('textbox', { name: 'Bullet text' });

beforeEach(() => {
  withDeterministicUUID('row');
});

describe('BulletRow keyboard', () => {
  it('Enter creates a new sibling after this bullet', () => {
    const { value } = renderRow(node('n1'));
    fireEvent.keyDown(editable(), { key: 'Enter' });
    expect(value.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'NEW_SIBLING_AFTER', afterId: 'n1' }),
    );
  });

  it('Shift+Enter does NOT create a sibling', () => {
    const { value } = renderRow(node('n1'));
    fireEvent.keyDown(editable(), { key: 'Enter', shiftKey: true });
    expect(value.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'NEW_SIBLING_AFTER' }),
    );
  });

  it('Tab indents and expands the new parent', () => {
    const onEnsureExpanded = vi.fn();
    const { value } = renderRow(node('n1'), { indentParentId: 'p', onEnsureExpanded });
    fireEvent.keyDown(editable(), { key: 'Tab' });
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'INDENT', id: 'n1' });
    expect(onEnsureExpanded).toHaveBeenCalledWith('p');
  });

  it('Shift+Tab outdents', () => {
    const { value } = renderRow(node('n1'));
    fireEvent.keyDown(editable(), { key: 'Tab', shiftKey: true });
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'OUTDENT', id: 'n1' });
  });

  it('Cmd/Ctrl+Enter toggles completion', () => {
    const { value } = renderRow(node('n1'));
    fireEvent.keyDown(editable(), { key: 'Enter', metaKey: true });
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_COMPLETE', id: 'n1' });
  });
});

describe('BulletRow text editing', () => {
  it('sanitizes non-breaking spaces and newlines before dispatching SET_TEXT', () => {
    const { value } = renderRow(node('n1'));
    const el = editable();
    el.textContent = 'a b\nc';
    fireEvent.input(el);
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'SET_TEXT', id: 'n1', text: 'a bc' });
  });
});

describe('BulletRow marker (zoom)', () => {
  it('zooms into a leaf and provides a new child id', () => {
    const { value } = renderRow(node('n1'));
    fireEvent.click(screen.getByRole('button', { name: 'Open sub-bullets in page view' }));
    expect(value.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ZOOM_INTO', id: 'n1', newChildId: expect.any(String) }),
    );
  });

  it('zooms into a parent without creating a child', () => {
    const parent = node('n1', [node('c')]);
    const { value } = renderRow(parent);
    fireEvent.click(screen.getByRole('button', { name: 'Open sub-bullets in page view' }));
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'ZOOM_INTO', id: 'n1' });
  });
});

describe('BulletRow disclosure + share', () => {
  it('shows the disclosure toggle only when the bullet has children', () => {
    renderRow(node('leaf'));
    expect(screen.queryByRole('button', { name: /sub-bullets$/ })).not.toBeInTheDocument();

    const onToggleExpand = vi.fn();
    renderRow(node('parent', [node('c')]), { onToggleExpand });
    const disclosure = screen.getByRole('button', { name: 'Expand sub-bullets' });
    fireEvent.click(disclosure);
    expect(onToggleExpand).toHaveBeenCalled();
  });

  it('share button calls shareNode', () => {
    const shareNode = vi.fn().mockResolvedValue(undefined);
    renderRow(node('n1'), {}, { shareNode });
    fireEvent.click(screen.getByRole('button', { name: 'Share this bullet' }));
    expect(shareNode).toHaveBeenCalledWith('n1');
  });
});

function setCaretAtStart(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(true);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

describe('BulletRow backspace-to-delete', () => {
  it('deletes an empty leaf bullet when Backspace is pressed with the caret at the start', () => {
    const { value } = renderRow(node('n1', [], { text: '' }));
    const el = editable();
    setCaretAtStart(el);
    fireEvent.keyDown(el, { key: 'Backspace' });
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'DELETE_NODE', id: 'n1' });
  });

  it('does NOT delete when the bullet still has text', () => {
    const { value } = renderRow(node('n1', [], { text: 'hello' }));
    const el = editable();
    setCaretAtStart(el);
    fireEvent.keyDown(el, { key: 'Backspace' });
    expect(value.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DELETE_NODE' }),
    );
  });

  it('does NOT delete an empty bullet that still has children', () => {
    const { value } = renderRow(node('n1', [node('c')], { text: '' }));
    const el = editable();
    setCaretAtStart(el);
    fireEvent.keyDown(el, { key: 'Backspace' });
    expect(value.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DELETE_NODE' }),
    );
  });
});

describe('BulletRow delete button', () => {
  it('deletes immediately when the bullet has no children', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { value } = renderRow(node('n1'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete this bullet' }));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'DELETE_NODE', id: 'n1' });
    confirmSpy.mockRestore();
  });

  it('asks for confirmation before deleting a bullet with children, and respects cancel', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { value } = renderRow(node('parent', [node('c')]));
    fireEvent.click(screen.getByRole('button', { name: 'Delete this bullet' }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(value.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DELETE_NODE' }),
    );
    confirmSpy.mockRestore();
  });

  it('deletes a bullet with children once confirmed', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { value } = renderRow(node('parent', [node('c')]));
    fireEvent.click(screen.getByRole('button', { name: 'Delete this bullet' }));
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'DELETE_NODE', id: 'parent' });
    confirmSpy.mockRestore();
  });
});

describe('BulletRow focus effect', () => {
  it('clears the focus request after focusing the bullet', () => {
    const { value } = renderRow(node('n1'), {}, {
      state: makeState([node('n1')], { focusedId: 'n1' }),
    });
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'SET_FOCUSED', id: null });
  });
});
