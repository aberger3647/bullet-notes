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

  it('Cmd/Ctrl+D duplicates this bullet', () => {
    const { value } = renderRow(node('n1'));
    fireEvent.keyDown(editable(), { key: 'd', metaKey: true });
    expect(value.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DUPLICATE_NODE', id: 'n1' }),
    );
  });
});

describe('BulletRow text editing', () => {
  it('sanitizes non-breaking spaces before dispatching SET_TEXT', () => {
    const { value } = renderRow(node('n1'));
    const el = editable();
    el.textContent = 'a b';
    fireEvent.input(el);
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'SET_TEXT', id: 'n1', text: 'a b' });
  });

  it('preserves literal newlines typed/pasted into the bullet (multi-line support)', () => {
    const { value } = renderRow(node('n1'));
    const el = editable();
    el.textContent = 'a\nb';
    fireEvent.input(el);
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'SET_TEXT', id: 'n1', text: 'a\nb' });
  });
});

describe('BulletRow Shift+Enter (multi-line)', () => {
  it('inserts a line break at the caret instead of creating a sibling', () => {
    const { value } = renderRow(node('n1', [], { text: 'ab' }));
    const el = editable();
    setCaretAtOffset(el, 1);
    fireEvent.keyDown(el, { key: 'Enter', shiftKey: true });
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'SET_TEXT', id: 'n1', text: 'a\nb' });
    expect(value.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'NEW_SIBLING_AFTER' }),
    );
  });
});

describe('BulletRow paste (multi-line)', () => {
  it('preserves newlines from pasted text instead of collapsing them to spaces', () => {
    const { value } = renderRow(node('n1', [], { text: '' }));
    const el = editable();
    const clipboardData = { getData: () => 'line1\nline2' };
    fireEvent.paste(el, { clipboardData });
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'SET_TEXT', id: 'n1', text: 'line1\nline2' });
  });
});

describe('BulletRow arrow-key navigation with multi-line text', () => {
  it('ArrowDown moves within the text when not on the last line', () => {
    const { value } = renderRow(node('n1', [], { text: 'a\nb' }), { nextVisibleId: 'next' });
    const el = editable();
    setCaretAtOffset(el, 0); // on the first line, of two
    fireEvent.keyDown(el, { key: 'ArrowDown' });
    expect(value.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_FOCUSED' }),
    );
  });

  it('ArrowDown moves to the next bullet when on the last line', () => {
    const { value } = renderRow(node('n1', [], { text: 'a\nb' }), { nextVisibleId: 'next' });
    const el = editable();
    setCaretAtOffset(el, 3); // on the second (last) line
    fireEvent.keyDown(el, { key: 'ArrowDown' });
    expect(value.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_FOCUSED', id: 'next' }),
    );
  });

  it('ArrowUp moves within the text when not on the first line', () => {
    const { value } = renderRow(node('n1', [], { text: 'a\nb' }), { prevVisibleId: 'prev' });
    const el = editable();
    setCaretAtOffset(el, 3); // on the second line
    fireEvent.keyDown(el, { key: 'ArrowUp' });
    expect(value.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_FOCUSED' }),
    );
  });

  it('ArrowUp moves to the previous bullet when on the first line', () => {
    const { value } = renderRow(node('n1', [], { text: 'a\nb' }), { prevVisibleId: 'prev' });
    const el = editable();
    setCaretAtOffset(el, 0);
    fireEvent.keyDown(el, { key: 'ArrowUp' });
    expect(value.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_FOCUSED', id: 'prev' }),
    );
  });
});

function fakeClipboardData(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial };
  return {
    setData: (type: string, val: string) => {
      store[type] = val;
    },
    getData: (type: string) => store[type] ?? '',
    types: Object.keys(store),
    _store: store,
  };
}

describe('BulletRow Cmd/Ctrl+Backspace (explicit delete)', () => {
  it('deletes immediately when the bullet has no children', () => {
    const { value } = renderRow(node('n1', [], { text: 'hello' }));
    fireEvent.keyDown(editable(), { key: 'Backspace', metaKey: true });
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'DELETE_NODE', id: 'n1' });
  });

  it('deletes a bullet with children immediately, without confirmation (relies on undo)', () => {
    const { value } = renderRow(node('parent', [node('c')]));
    fireEvent.keyDown(editable(), { key: 'Backspace', metaKey: true });
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'DELETE_NODE', id: 'parent' });
  });

  it('works regardless of caret position (not just at the start)', () => {
    const { value } = renderRow(node('n1', [], { text: 'hello' }));
    const el = editable();
    placeCaretAtEndHelper(el);
    fireEvent.keyDown(el, { key: 'Backspace', metaKey: true });
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'DELETE_NODE', id: 'n1' });
  });
});

describe('BulletRow drag-to-select (mouse)', () => {
  it('dragging from one bullet into another calls selectRange for both, in order', () => {
    const selectRange = vi.fn();
    const clearSelection = vi.fn();
    const { container } = renderWithContext(
      inDnd(
        <>
          <BulletRow node={node('a')} expanded={false} onToggleExpand={() => {}} />
          <BulletRow node={node('b')} expanded={false} onToggleExpand={() => {}} />
        </>,
        ['a', 'b'],
      ),
      { selectRange, clearSelection },
    );

    const rows = container.querySelectorAll('.bullet-row');
    const rowA = rows[0] as HTMLElement;
    const rowB = rows[1] as HTMLElement;
    const editableA = rowA.querySelector('.bullet-input') as HTMLElement;

    fireEvent.mouseDown(editableA, { button: 0 });
    document.elementFromPoint = vi.fn().mockReturnValue(rowB);
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, clientY: 0 }));

    expect(selectRange).toHaveBeenNthCalledWith(1, 'a');
    expect(selectRange).toHaveBeenNthCalledWith(2, 'b');
  });
});

describe('BulletRow copy (subtree)', () => {
  it('copies the whole bullet + children as a readable outline and as structured JSON, when nothing is text-selected', () => {
    const { value } = renderRow(node('n1', [node('c', [], { text: 'child' })], { text: 'parent' }));
    const el = editable();
    setCaretAtStart(el); // collapsed selection, not a text range
    const clipboardData = fakeClipboardData();
    fireEvent.copy(el, { clipboardData });
    expect(clipboardData._store['text/plain']).toBe('parent\n\tchild');
    const json = JSON.parse(clipboardData._store['application/x-bullet-notes-outline']!);
    expect(json).toMatchObject({ text: 'parent', children: [{ text: 'child' }] });
    expect(value.dispatch).not.toHaveBeenCalled();
  });

  it('does not hijack copy when there is an active text selection (lets default text-copy happen)', () => {
    const { value } = renderRow(node('n1', [], { text: 'hello' }));
    const el = editable();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range); // non-collapsed selection
    const clipboardData = fakeClipboardData();
    fireEvent.copy(el, { clipboardData });
    expect(clipboardData._store['text/plain']).toBeUndefined();
    expect(value.dispatch).not.toHaveBeenCalled();
  });

});

describe('BulletRow paste (subtree)', () => {
  it('reconstructs a pasted subtree as a new sibling instead of flattening it into text', () => {
    const { value } = renderRow(node('n1', [], { text: '' }));
    const el = editable();
    const outlineJson = JSON.stringify({
      id: 'old-id',
      text: 'copied root',
      completed: false,
      children: [{ id: 'old-child', text: 'copied child', completed: false, children: [] }],
    });
    const clipboardData = fakeClipboardData({ 'application/x-bullet-notes-outline': outlineJson });
    fireEvent.paste(el, { clipboardData });
    expect(value.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PASTE_SUBTREE',
        afterId: 'n1',
        subtree: expect.objectContaining({ text: 'copied root' }),
      }),
    );
    expect(value.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_TEXT' }),
    );
  });

  it('falls back to plain text insertion for regular (non-outline) paste', () => {
    const { value } = renderRow(node('n1', [], { text: '' }));
    const el = editable();
    const clipboardData = fakeClipboardData({ 'text/plain': 'line1\nline2' });
    fireEvent.paste(el, { clipboardData });
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'SET_TEXT', id: 'n1', text: 'line1\nline2' });
  });
});

describe('BulletRow paste (outline)', () => {
  it('splits a tab-indented plain-text paste into nested bullets', () => {
    const { value } = renderRow(node('n1', [], { text: '' }));
    const el = editable();
    const clipboardData = fakeClipboardData({ 'text/plain': 'parent\n\tchild' });
    fireEvent.paste(el, { clipboardData });
    expect(value.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PASTE_OUTLINE',
        afterId: 'n1',
        roots: [
          expect.objectContaining({
            text: 'parent',
            children: [expect.objectContaining({ text: 'child' })],
          }),
        ],
      }),
    );
    expect(value.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_TEXT' }));
  });

  it('splits a markdown list paste into flat sibling bullets', () => {
    const { value } = renderRow(node('n1', [], { text: '' }));
    const el = editable();
    const clipboardData = fakeClipboardData({ 'text/plain': '- one\n- two' });
    fireEvent.paste(el, { clipboardData });
    expect(value.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PASTE_OUTLINE',
        afterId: 'n1',
        roots: [
          expect.objectContaining({ text: 'one' }),
          expect.objectContaining({ text: 'two' }),
        ],
      }),
    );
  });

  it('marks a GFM checkbox markdown item as completed', () => {
    const { value } = renderRow(node('n1', [], { text: '' }));
    const el = editable();
    const clipboardData = fakeClipboardData({ 'text/plain': '- [x] done' });
    fireEvent.paste(el, { clipboardData });
    expect(value.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PASTE_OUTLINE',
        roots: [expect.objectContaining({ text: 'done', completed: true })],
      }),
    );
  });

  it('splits an HTML list paste into bullets', () => {
    const { value } = renderRow(node('n1', [], { text: '' }));
    const el = editable();
    const clipboardData = fakeClipboardData({
      'text/html': '<ul><li>a</li><li>b</li></ul>',
      'text/plain': 'a\nb',
    });
    fireEvent.paste(el, { clipboardData });
    expect(value.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PASTE_OUTLINE',
        roots: [expect.objectContaining({ text: 'a' }), expect.objectContaining({ text: 'b' })],
      }),
    );
  });

  it('falls back to plain text when pasted HTML has no list structure', () => {
    const { value } = renderRow(node('n1', [], { text: '' }));
    const el = editable();
    const clipboardData = fakeClipboardData({ 'text/html': '<p>hello</p>', 'text/plain': 'hello' });
    fireEvent.paste(el, { clipboardData });
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'SET_TEXT', id: 'n1', text: 'hello' });
  });
});

function swipeLeft(el: HTMLElement, distance: number) {
  fireEvent.pointerDown(el, { pointerType: 'touch', pointerId: 1, clientX: 300, clientY: 100 });
  fireEvent.pointerMove(el, { pointerType: 'touch', pointerId: 1, clientX: 300 - distance, clientY: 100 });
  fireEvent.pointerUp(el, { pointerType: 'touch', pointerId: 1, clientX: 300 - distance, clientY: 100 });
}

describe('BulletRow swipe-to-delete (mobile)', () => {
  it('deletes a leaf bullet on a full left swipe past the threshold', () => {
    const { value, container } = renderRow(node('n1', [], { text: 'hello' }));
    const row = container.querySelector('.bullet-row') as HTMLElement;
    swipeLeft(row, 100);
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'DELETE_NODE', id: 'n1' });
  });

  it('deletes a bullet with children via swipe, without confirmation', () => {
    const { value, container } = renderRow(node('parent', [node('c')]));
    const row = container.querySelector('.bullet-row') as HTMLElement;
    swipeLeft(row, 100);
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'DELETE_NODE', id: 'parent' });
  });

  it('does NOT delete on a short swipe that does not cross the threshold', () => {
    const { value, container } = renderRow(node('n1', [], { text: 'hello' }));
    const row = container.querySelector('.bullet-row') as HTMLElement;
    swipeLeft(row, 20);
    expect(value.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DELETE_NODE' }),
    );
  });

  it('ignores non-touch (mouse) pointer input', () => {
    const { value, container } = renderRow(node('n1', [], { text: 'hello' }));
    const row = container.querySelector('.bullet-row') as HTMLElement;
    fireEvent.pointerDown(row, { pointerType: 'mouse', pointerId: 1, clientX: 300, clientY: 100 });
    fireEvent.pointerMove(row, { pointerType: 'mouse', pointerId: 1, clientX: 180, clientY: 100 });
    fireEvent.pointerUp(row, { pointerType: 'mouse', pointerId: 1, clientX: 180, clientY: 100 });
    expect(value.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DELETE_NODE' }),
    );
  });
});

describe('BulletRow marker vs. swipe-to-delete (touch pointer conflict)', () => {
  it('a touch pointerdown starting on the drag handle does not arm the row swipe tracker', () => {
    const { value, container } = renderWithContext(
      <DndContext sensors={[]}>
        <SortableContext items={['n1']}>
          <BulletRow node={node('n1', [], { text: 'hello' })} expanded={false} onToggleExpand={() => {}} />
        </SortableContext>
      </DndContext>,
    );
    const marker = screen.getByRole('button', { name: 'Open sub-bullets in page view' });
    const row = container.querySelector('.bullet-row') as HTMLElement;

    // Same physical gesture as `swipeLeft` above, except the touch starts on the drag handle (a
    // descendant of .bullet-row) instead of directly on the row — reproducing the bubbling
    // conflict: without the marker's stopPropagation fix, this pointerdown reaches
    // onSwipePointerDown on the ancestor row and arms swipe-tracking, so a drag gesture that
    // drifts left can accidentally delete the bullet being dragged.
    fireEvent.pointerDown(marker, { pointerType: 'touch', pointerId: 1, clientX: 300, clientY: 100 });
    fireEvent.pointerMove(row, { pointerType: 'touch', pointerId: 1, clientX: 200, clientY: 100 });
    fireEvent.pointerUp(row, { pointerType: 'touch', pointerId: 1, clientX: 200, clientY: 100 });

    expect(value.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DELETE_NODE' }),
    );
  });
});

describe('BulletRow read-only (view-only shared docs)', () => {
  it('renders the text as non-editable', () => {
    renderRow(node('n1', [], { text: 'hello' }), {}, { readOnly: true });
    expect(editable()).toHaveAttribute('contenteditable', 'false');
  });

  it('ignores keyboard shortcuts that would mutate the tree', () => {
    const { value } = renderRow(node('n1', [], { text: 'hello' }), {}, { readOnly: true });
    fireEvent.keyDown(editable(), { key: 'Enter' });
    fireEvent.keyDown(editable(), { key: 'Tab' });
    fireEvent.keyDown(editable(), { key: 'd', metaKey: true });
    expect(value.dispatch).not.toHaveBeenCalled();
  });

  it('is editable when not read-only', () => {
    renderRow(node('n1', [], { text: 'hello' }));
    expect(editable()).toHaveAttribute('contenteditable', 'true');
  });
});

describe('BulletRow presence (per-user attribution)', () => {
  it('shows a badge with the name of another editor currently on this bullet', () => {
    renderRow(node('n1', [], { text: 'hello' }), {}, {
      otherPresences: [{ clientId: 'peer-1', displayName: 'Ada', editingId: 'n1' }],
    });
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('shows no badge when nobody else is editing this bullet', () => {
    renderRow(node('n1', [], { text: 'hello' }), {}, {
      otherPresences: [{ clientId: 'peer-1', displayName: 'Ada', editingId: 'other-id' }],
    });
    expect(screen.queryByText('Ada')).not.toBeInTheDocument();
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

describe('BulletRow marker click / shift-click', () => {
  const marker = () => screen.getByRole('button', { name: 'Open sub-bullets in page view' });

  it('plain click zooms into the bullet', () => {
    const { value } = renderRow(node('n1'));
    fireEvent.click(marker());
    expect(value.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ZOOM_INTO', id: 'n1' }),
    );
  });

  it('shift+click selects a range instead of zooming', () => {
    const selectRange = vi.fn();
    const { value } = renderRow(node('n1'), {}, { selectRange });
    fireEvent.click(marker(), { shiftKey: true });
    expect(selectRange).toHaveBeenCalledWith('n1');
    expect(value.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ZOOM_INTO' }),
    );
  });

  it('shift+click is ignored in read-only mode (falls through to zoom, which is itself a no-op there)', () => {
    const selectRange = vi.fn();
    renderRow(node('n1'), {}, { selectRange, readOnly: true });
    fireEvent.click(marker(), { shiftKey: true });
    expect(selectRange).not.toHaveBeenCalled();
  });

  it('renders a light-blue selection highlight on the row when selected', () => {
    const { container } = renderRow(node('n1'), {}, { selectedIds: new Set(['n1']) });
    expect(container.querySelector('.bullet-row--selected')).not.toBeNull();
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

function setCaretAtOffset(el: HTMLElement, offset: number) {
  const textNode = el.firstChild;
  if (!textNode) return;
  const range = document.createRange();
  range.setStart(textNode, offset);
  range.collapse(true);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

describe('BulletRow arrow-key navigation', () => {
  it('ArrowUp moves focus to the previous visible bullet, preserving caret offset', () => {
    const { value } = renderRow(node('n1', [], { text: 'hello' }), { prevVisibleId: 'prev' });
    const el = editable();
    setCaretAtOffset(el, 3);
    fireEvent.keyDown(el, { key: 'ArrowUp' });
    expect(value.dispatch).toHaveBeenCalledWith({
      type: 'SET_FOCUSED',
      id: 'prev',
      caret: { offset: 3 },
    });
  });

  it('ArrowDown moves focus to the next visible bullet, preserving caret offset', () => {
    const { value } = renderRow(node('n1', [], { text: 'hello' }), { nextVisibleId: 'next' });
    const el = editable();
    setCaretAtOffset(el, 2);
    fireEvent.keyDown(el, { key: 'ArrowDown' });
    expect(value.dispatch).toHaveBeenCalledWith({
      type: 'SET_FOCUSED',
      id: 'next',
      caret: { offset: 2 },
    });
  });

  it('does nothing on ArrowUp when there is no previous visible bullet', () => {
    const { value } = renderRow(node('n1'));
    fireEvent.keyDown(editable(), { key: 'ArrowUp' });
    expect(value.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_FOCUSED' }),
    );
  });

  it('does nothing on ArrowDown when there is no next visible bullet', () => {
    const { value } = renderRow(node('n1'));
    fireEvent.keyDown(editable(), { key: 'ArrowDown' });
    expect(value.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_FOCUSED' }),
    );
  });
});

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

  it('merges into the previous visible bullet when text remains and the caret is at the start', () => {
    const { value } = renderRow(node('n1', [], { text: 'hello' }), { prevVisibleId: 'prev' });
    const el = editable();
    setCaretAtStart(el);
    fireEvent.keyDown(el, { key: 'Backspace' });
    expect(value.dispatch).toHaveBeenCalledWith({
      type: 'MERGE_WITH_PREVIOUS',
      id: 'n1',
      targetId: 'prev',
    });
  });

  it('does NOT merge when the caret is not at the start', () => {
    const { value } = renderRow(node('n1', [], { text: 'hello' }), { prevVisibleId: 'prev' });
    const el = editable();
    placeCaretAtEndHelper(el);
    fireEvent.keyDown(el, { key: 'Backspace' });
    expect(value.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'MERGE_WITH_PREVIOUS' }),
    );
  });

  it('does NOT merge when there is no previous visible bullet', () => {
    const { value } = renderRow(node('n1', [], { text: 'hello' }));
    const el = editable();
    setCaretAtStart(el);
    fireEvent.keyDown(el, { key: 'Backspace' });
    expect(value.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'MERGE_WITH_PREVIOUS' }),
    );
  });
});

function placeCaretAtEndHelper(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

describe('BulletRow delete button', () => {
  it('does not render an inline delete/trash button', () => {
    renderRow(node('n1'));
    expect(screen.queryByRole('button', { name: 'Delete this bullet' })).not.toBeInTheDocument();
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
