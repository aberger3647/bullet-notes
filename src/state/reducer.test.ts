import { describe, it, expect } from 'vitest';
import { node, threeLevel } from '../test/factories';
import { appReducer, initialAppState } from './reducer';
import { getChildrenForZoom } from './treeOps';
import type { AppState, BulletNode } from './types';
import { MAX_HISTORY } from './types';

function stateWith(tree: BulletNode[], extra: Partial<AppState> = {}): AppState {
  return {
    tree,
    zoomPath: [],
    settings: { hideCompleted: false, theme: 'light' },
    history: { past: [], future: [] },
    focusedId: null,
    focusCaret: 'all',
    ...extra,
  };
}

const ids = (nodes: BulletNode[]): string[] => nodes.flatMap((n) => [n.id, ...ids(n.children)]);

describe('SET_TEXT', () => {
  it('updates text WITHOUT committing history (typing is grouped, not per-keystroke undoable)', () => {
    const s = stateWith([node('a', [], { text: 'old' })]);
    const next = appReducer(s, { type: 'SET_TEXT', id: 'a', text: 'new' });
    expect(next.tree[0]!.text).toBe('new');
    expect(next.history.past).toHaveLength(0);
  });

  it('returns the same state when the node is missing', () => {
    const s = stateWith([node('a')]);
    expect(appReducer(s, { type: 'SET_TEXT', id: 'nope', text: 'x' })).toBe(s);
  });
});

describe('TOGGLE_COMPLETE', () => {
  it('toggles and commits history', () => {
    const s = stateWith([node('a')]);
    const next = appReducer(s, { type: 'TOGGLE_COMPLETE', id: 'a' });
    expect(next.tree[0]!.completed).toBe(true);
    expect(next.history.past).toHaveLength(1);
  });

  it('returns the same state for a missing node', () => {
    const s = stateWith([node('a')]);
    expect(appReducer(s, { type: 'TOGGLE_COMPLETE', id: 'nope' })).toBe(s);
  });
});

describe('NEW_SIBLING_AFTER / NEW_SIBLING_BEFORE', () => {
  it('inserts after with explicit id, focuses the new node, commits', () => {
    const s = stateWith([node('a'), node('b')]);
    const next = appReducer(s, { type: 'NEW_SIBLING_AFTER', afterId: 'a', newId: 'n' });
    expect(next.tree.map((n) => n.id)).toEqual(['a', 'n', 'b']);
    expect(next.focusedId).toBe('n');
    expect(next.history.past).toHaveLength(1);
  });

  it('inserts before with explicit id', () => {
    const s = stateWith([node('a'), node('b')]);
    const next = appReducer(s, { type: 'NEW_SIBLING_BEFORE', beforeId: 'b', newId: 'n' });
    expect(next.tree.map((n) => n.id)).toEqual(['a', 'n', 'b']);
    expect(next.focusedId).toBe('n');
  });

  it('returns the same state when the anchor is missing', () => {
    const s = stateWith([node('a')]);
    expect(appReducer(s, { type: 'NEW_SIBLING_AFTER', afterId: 'nope', newId: 'n' })).toBe(s);
  });
});

describe('APPEND_CHILD', () => {
  it('appends to a parent', () => {
    const s = stateWith([node('a', [node('a1')])]);
    const next = appReducer(s, { type: 'APPEND_CHILD', parentId: 'a', newId: 'n' });
    expect(next.tree[0]!.children.map((n) => n.id)).toEqual(['a1', 'n']);
    expect(next.focusedId).toBe('n');
    expect(next.history.past).toHaveLength(1);
  });

  it('appends to root with the special __root__ parent', () => {
    const s = stateWith([node('a')]);
    const next = appReducer(s, { type: 'APPEND_CHILD', parentId: '__root__', newId: 'n' });
    expect(next.tree.map((n) => n.id)).toEqual(['a', 'n']);
    expect(next.focusedId).toBe('n');
  });
});

describe('INDENT', () => {
  it('indents a non-first sibling, focuses it, commits', () => {
    const s = stateWith([node('a'), node('b')]);
    const next = appReducer(s, { type: 'INDENT', id: 'b' });
    expect(next.tree[0]!.children.map((n) => n.id)).toEqual(['b']);
    expect(next.focusedId).toBe('b');
    expect(next.history.past).toHaveLength(1);
  });

  it('is a no-op (no history) for a first sibling', () => {
    const s = stateWith([node('a'), node('b')]);
    expect(appReducer(s, { type: 'INDENT', id: 'a' })).toBe(s);
  });
});

describe('OUTDENT', () => {
  it('outdents a nested node and keeps zoomPath when it stays visible', () => {
    // zoom into 'a'; outdent 'c' (child of p) so it becomes a's child — still visible under 'a'.
    const tree = [node('a', [node('p', [node('c')]), node('q')])];
    const s = stateWith(tree, { zoomPath: ['a'] });
    const next = appReducer(s, { type: 'OUTDENT', id: 'c' });
    expect(next.tree[0]!.children.map((n) => n.id)).toEqual(['p', 'c', 'q']);
    expect(next.zoomPath).toEqual(['a']);
    expect(next.focusedId).toBe('c');
    expect(getChildrenForZoom(next.tree, next.zoomPath).some((n) => n.id === 'c')).toBe(true);
  });

  it('keeps the current zoomPath even when the outdented node leaves the current view', () => {
    // Viewing b's children (['c']); outdent c so it becomes a sibling of b under a.
    // The view should NOT jump out to follow it — it just leaves the zoomed-in view.
    const s = stateWith(threeLevel(), { zoomPath: ['a', 'b'] });
    const next = appReducer(s, { type: 'OUTDENT', id: 'c' });
    expect(next.zoomPath).toEqual(['a', 'b']);
    expect(next.focusedId).toBeNull();
    expect(getChildrenForZoom(next.tree, next.zoomPath).some((n) => n.id === 'c')).toBe(false);
  });

  it('is a no-op for a root-level node', () => {
    const s = stateWith([node('a'), node('b')]);
    expect(appReducer(s, { type: 'OUTDENT', id: 'a' })).toBe(s);
  });
});

describe('BULK_TOGGLE_COMPLETE', () => {
  it('marks all selected complete when any is incomplete, in one history commit', () => {
    const s = stateWith([node('a', [], { completed: true }), node('b'), node('c')]);
    const next = appReducer(s, { type: 'BULK_TOGGLE_COMPLETE', ids: ['a', 'b', 'c'] });
    expect(next.tree.map((n) => n.completed)).toEqual([true, true, true]);
    expect(next.history.past).toHaveLength(1);
  });

  it('marks all selected incomplete when all are already complete', () => {
    const s = stateWith([
      node('a', [], { completed: true }),
      node('b', [], { completed: true }),
    ]);
    const next = appReducer(s, { type: 'BULK_TOGGLE_COMPLETE', ids: ['a', 'b'] });
    expect(next.tree.map((n) => n.completed)).toEqual([false, false]);
  });

  it('is a no-op for an empty selection', () => {
    const s = stateWith([node('a')]);
    expect(appReducer(s, { type: 'BULK_TOGGLE_COMPLETE', ids: [] })).toBe(s);
  });
});

describe('BULK_INDENT', () => {
  it('indents a contiguous run of siblings under the preceding one, preserving their order', () => {
    const s = stateWith([node('a'), node('b'), node('c'), node('d')]);
    const next = appReducer(s, { type: 'BULK_INDENT', ids: ['b', 'c', 'd'] });
    expect(next.tree.map((n) => n.id)).toEqual(['a']);
    expect(next.tree[0]!.children.map((n) => n.id)).toEqual(['b', 'c', 'd']);
    expect(next.history.past).toHaveLength(1);
  });
});

describe('BULK_OUTDENT', () => {
  it('outdents a contiguous run of children, preserving their order after the parent', () => {
    const tree = [node('a', [node('b'), node('c'), node('d')]), node('e')];
    const s = stateWith(tree);
    const next = appReducer(s, { type: 'BULK_OUTDENT', ids: ['b', 'c', 'd'] });
    expect(next.tree.map((n) => n.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(next.tree[0]!.children).toEqual([]);
    expect(next.history.past).toHaveLength(1);
  });
});

describe('DELETE_NODE', () => {
  it('removes a leaf node and focuses the previous sibling, commits', () => {
    const s = stateWith([node('a'), node('b')]);
    const next = appReducer(s, { type: 'DELETE_NODE', id: 'b' });
    expect(next.tree.map((n) => n.id)).toEqual(['a']);
    expect(next.focusedId).toBe('a');
    // Focus lands at the end of the merged-into bullet, not a destructive select-all.
    expect(next.focusCaret).toBe('end');
    expect(next.history.past).toHaveLength(1);
  });

  it('focuses the next sibling when deleting the first top-level bullet', () => {
    const s = stateWith([node('a'), node('b')]);
    const next = appReducer(s, { type: 'DELETE_NODE', id: 'a' });
    expect(next.tree.map((n) => n.id)).toEqual(['b']);
    expect(next.focusedId).toBe('b');
    expect(next.focusCaret).toEqual({ offset: 0 });
  });

  it('focuses the parent when deleting a first child', () => {
    const s = stateWith([node('a', [node('a1'), node('a2')])]);
    const next = appReducer(s, { type: 'DELETE_NODE', id: 'a1' });
    expect(next.tree[0]!.children.map((n) => n.id)).toEqual(['a2']);
    expect(next.focusedId).toBe('a');
  });

  it('removes an entire subtree', () => {
    const s = stateWith(threeLevel());
    const next = appReducer(s, { type: 'DELETE_NODE', id: 'b' });
    expect(ids(next.tree)).toEqual(['a']);
  });

  it('is a no-op when deleting the only remaining top-level node', () => {
    const s = stateWith([node('a')]);
    expect(appReducer(s, { type: 'DELETE_NODE', id: 'a' })).toBe(s);
  });

  it('returns the same state for a missing node', () => {
    const s = stateWith([node('a'), node('b')]);
    expect(appReducer(s, { type: 'DELETE_NODE', id: 'nope' })).toBe(s);
  });

  it('recomputes zoomPath when the deleted node was on the current zoom path', () => {
    const s = stateWith(threeLevel(), { zoomPath: ['a', 'b'] });
    const next = appReducer(s, { type: 'DELETE_NODE', id: 'b' });
    expect(next.zoomPath).toEqual(['a']);
  });
});

describe('DUPLICATE_NODE', () => {
  it('inserts a copy right after the original, with a fresh id, and focuses it', () => {
    const s = stateWith([node('a', [], { text: 'hello' }), node('b')]);
    const next = appReducer(s, { type: 'DUPLICATE_NODE', id: 'a', newId: 'a-copy' });
    expect(next.tree.map((n) => n.id)).toEqual(['a', 'a-copy', 'b']);
    expect(next.tree[1]!.text).toBe('hello');
    expect(next.focusedId).toBe('a-copy');
    expect(next.history.past).toHaveLength(1);
  });

  it('duplicates children along with the node', () => {
    const s = stateWith([node('a', [node('a1')])]);
    const next = appReducer(s, { type: 'DUPLICATE_NODE', id: 'a', newId: 'a-copy' });
    expect(next.tree.map((n) => n.id)).toEqual(['a', 'a-copy']);
    expect(next.tree[1]!.children).toHaveLength(1);
    expect(next.tree[1]!.children[0]!.id).not.toBe('a1');
    expect(next.tree[1]!.children[0]!.text).toBe('a1');
  });

  it('returns the same state for a missing node', () => {
    const s = stateWith([node('a')]);
    expect(appReducer(s, { type: 'DUPLICATE_NODE', id: 'nope', newId: 'x' })).toBe(s);
  });
});

describe('MERGE_WITH_PREVIOUS', () => {
  it('merges text into the target, focuses it at the join offset, commits', () => {
    const s = stateWith([node('a', [], { text: 'foo' }), node('b', [], { text: 'bar' })]);
    const next = appReducer(s, { type: 'MERGE_WITH_PREVIOUS', id: 'b', targetId: 'a' });
    expect(next.tree.map((n) => n.id)).toEqual(['a']);
    expect(next.tree[0]!.text).toBe('foobar');
    expect(next.focusedId).toBe('a');
    expect(next.focusCaret).toEqual({ offset: 3 });
    expect(next.history.past).toHaveLength(1);
  });

  it('returns the same state when either node is missing', () => {
    const s = stateWith([node('a')]);
    expect(appReducer(s, { type: 'MERGE_WITH_PREVIOUS', id: 'nope', targetId: 'a' })).toBe(s);
    expect(appReducer(s, { type: 'MERGE_WITH_PREVIOUS', id: 'a', targetId: 'nope' })).toBe(s);
  });

  it('is a no-op when id === targetId', () => {
    const s = stateWith([node('a')]);
    expect(appReducer(s, { type: 'MERGE_WITH_PREVIOUS', id: 'a', targetId: 'a' })).toBe(s);
  });
});

describe('PASTE_SUBTREE', () => {
  it('inserts the pasted subtree after the target, with fresh ids, and focuses the root', () => {
    const s = stateWith([node('a')]);
    const pasted = node('x', [node('x1')], { text: 'pasted root' });
    const next = appReducer(s, {
      type: 'PASTE_SUBTREE',
      afterId: 'a',
      subtree: pasted,
      newId: 'fresh-root',
    });
    expect(next.tree.map((n) => n.id)).toEqual(['a', 'fresh-root']);
    expect(next.tree[1]!.text).toBe('pasted root');
    expect(next.tree[1]!.children).toHaveLength(1);
    expect(next.tree[1]!.children[0]!.id).not.toBe('x1');
    expect(next.focusedId).toBe('fresh-root');
    expect(next.history.past).toHaveLength(1);
  });

  it('strips any shareToken carried in the pasted data', () => {
    const s = stateWith([node('a')]);
    const pasted = node('x', [], { text: 'pasted', shareToken: 'stale-token' });
    const next = appReducer(s, { type: 'PASTE_SUBTREE', afterId: 'a', subtree: pasted, newId: 'fresh' });
    expect(next.tree[1]!.shareToken).toBeUndefined();
  });

  it('returns the same state when the target is missing', () => {
    const s = stateWith([node('a')]);
    expect(
      appReducer(s, { type: 'PASTE_SUBTREE', afterId: 'nope', subtree: node('x'), newId: 'fresh' }),
    ).toBe(s);
  });
});

describe('PASTE_OUTLINE', () => {
  it('inserts all pasted roots as fresh-id siblings after the target, focusing the last root', () => {
    const s = stateWith([node('a')]);
    const pasted = [
      node('x', [], { text: 'first' }),
      node('y', [node('y1')], { text: 'second' }),
    ];
    const next = appReducer(s, {
      type: 'PASTE_OUTLINE',
      afterId: 'a',
      roots: pasted,
      newId: 'fresh-first',
    });
    expect(next.tree.map((n) => n.id)).toEqual(['a', 'fresh-first', next.tree[2]!.id]);
    expect(next.tree[1]!.text).toBe('first');
    expect(next.tree[2]!.text).toBe('second');
    expect(next.tree[2]!.children).toHaveLength(1);
    expect(next.tree[2]!.children[0]!.id).not.toBe('y1');
    expect(next.focusedId).toBe(next.tree[2]!.id);
    expect(next.focusCaret).toBe('end');
    expect(next.history.past).toHaveLength(1);
  });

  it('is a no-op when roots is empty', () => {
    const s = stateWith([node('a')]);
    expect(appReducer(s, { type: 'PASTE_OUTLINE', afterId: 'a', roots: [] })).toBe(s);
  });

  it('returns the same state when the target is missing', () => {
    const s = stateWith([node('a')]);
    expect(
      appReducer(s, { type: 'PASTE_OUTLINE', afterId: 'nope', roots: [node('x')] }),
    ).toBe(s);
  });
});

describe('IMPORT_OUTLINE', () => {
  it('appends imported roots to the root level with fresh ids', () => {
    const s = stateWith([node('a')]);
    const imported = [node('x', [node('x1')], { text: 'imported' })];
    const next = appReducer(s, { type: 'IMPORT_OUTLINE', parentId: '__root__', roots: imported });
    expect(next.tree.map((n) => n.text)).toEqual(['a', 'imported']);
    expect(next.tree[1]!.id).not.toBe('x');
    expect(next.tree[1]!.children).toHaveLength(1);
    expect(next.tree[1]!.children[0]!.id).not.toBe('x1');
    expect(next.history.past).toHaveLength(1);
  });

  it('appends imported roots as children of a specific parent', () => {
    const s = stateWith([node('a', [node('a1')])]);
    const imported = [node('x', [], { text: 'imported' })];
    const next = appReducer(s, { type: 'IMPORT_OUTLINE', parentId: 'a', roots: imported });
    expect(next.tree[0]!.children.map((n) => n.text)).toEqual(['a1', 'imported']);
  });

  it('is a no-op for an empty import', () => {
    const s = stateWith([node('a')]);
    expect(appReducer(s, { type: 'IMPORT_OUTLINE', parentId: '__root__', roots: [] })).toBe(s);
  });
});

describe('ZOOM_INTO', () => {
  it('zooms into a parent node, clears focus, commits', () => {
    const s = stateWith([node('a', [node('a1')])]);
    const next = appReducer(s, { type: 'ZOOM_INTO', id: 'a' });
    expect(next.zoomPath).toEqual(['a']);
    expect(next.focusedId).toBeNull();
    expect(next.history.past).toHaveLength(1);
  });

  it('auto-creates a child (with explicit id) when zooming into a leaf and focuses it', () => {
    const s = stateWith([node('a')]);
    const next = appReducer(s, { type: 'ZOOM_INTO', id: 'a', newChildId: 'kid' });
    expect(next.tree[0]!.children.map((n) => n.id)).toEqual(['kid']);
    expect(next.zoomPath).toEqual(['a']);
    expect(next.focusedId).toBe('kid');
  });

  it('REGRESSION: zooming into a deeply nested node builds the full path and shows ITS children', () => {
    // The bug we fixed: zoom into a 3-level-deep node used to render the parent's list.
    const s = stateWith(threeLevel()); // a > b > c, from root
    const next = appReducer(s, { type: 'ZOOM_INTO', id: 'c', newChildId: 'c1' });
    expect(next.zoomPath).toEqual(['a', 'b', 'c']);
    expect(getChildrenForZoom(next.tree, next.zoomPath).map((n) => n.id)).toEqual(['c1']);
  });

  it('builds the full path even when already zoomed elsewhere', () => {
    const s = stateWith(threeLevel(), { zoomPath: ['a'] });
    const next = appReducer(s, { type: 'ZOOM_INTO', id: 'c' });
    expect(next.zoomPath).toEqual(['a', 'b', 'c']);
  });

  it('returns the same state for a missing node', () => {
    const s = stateWith([node('a')]);
    expect(appReducer(s, { type: 'ZOOM_INTO', id: 'nope' })).toBe(s);
  });
});

describe('ZOOM_BACK', () => {
  it('pops one level', () => {
    const s = stateWith(threeLevel(), { zoomPath: ['a', 'b'] });
    expect(appReducer(s, { type: 'ZOOM_BACK' }).zoomPath).toEqual(['a']);
  });

  it('is a no-op at root', () => {
    const s = stateWith([node('a')], { zoomPath: [] });
    expect(appReducer(s, { type: 'ZOOM_BACK' })).toBe(s);
  });
});

describe('ZOOM_TO_LEVEL', () => {
  it('slices to the requested level', () => {
    const s = stateWith(threeLevel(), { zoomPath: ['a', 'b', 'c'] });
    expect(appReducer(s, { type: 'ZOOM_TO_LEVEL', level: 1 }).zoomPath).toEqual(['a']);
    expect(appReducer(s, { type: 'ZOOM_TO_LEVEL', level: 0 }).zoomPath).toEqual([]);
  });

  it('clamps above the path length and returns the same state when unchanged', () => {
    const s = stateWith(threeLevel(), { zoomPath: ['a', 'b'] });
    expect(appReducer(s, { type: 'ZOOM_TO_LEVEL', level: 99 })).toBe(s);
  });

  it('floors and clamps negative levels to 0', () => {
    const s = stateWith(threeLevel(), { zoomPath: ['a', 'b'] });
    expect(appReducer(s, { type: 'ZOOM_TO_LEVEL', level: -3 }).zoomPath).toEqual([]);
  });
});

describe('NAVIGATE_TO_BULLET', () => {
  it('zooms to the node’s parent path and focuses the node', () => {
    const s = stateWith(threeLevel());
    const next = appReducer(s, { type: 'NAVIGATE_TO_BULLET', id: 'c' });
    expect(next.zoomPath).toEqual(['a', 'b']);
    expect(next.focusedId).toBe('c');
  });

  it('returns the same state for a missing node', () => {
    const s = stateWith([node('a')]);
    expect(appReducer(s, { type: 'NAVIGATE_TO_BULLET', id: 'nope' })).toBe(s);
  });
});

describe('MOVE_NODE', () => {
  it('nests a node as a child when nest=true', () => {
    const s = stateWith([node('a', [node('a1')]), node('b')]);
    const next = appReducer(s, { type: 'MOVE_NODE', activeId: 'b', overId: 'a', nest: true });
    expect(next.tree.map((n) => n.id)).toEqual(['a']);
    expect(next.tree[0]!.children.map((n) => n.id)).toEqual(['a1', 'b']);
  });

  it('reorders siblings when nest=false and same parent', () => {
    const s = stateWith([node('a'), node('b'), node('c')]);
    const next = appReducer(s, { type: 'MOVE_NODE', activeId: 'a', overId: 'c', nest: false });
    expect(next.tree.map((n) => n.id)).toEqual(['b', 'c', 'a']);
  });

  it('moves before a sibling across parents when nest=false', () => {
    const s = stateWith([node('a', [node('a1')]), node('b')]);
    const next = appReducer(s, { type: 'MOVE_NODE', activeId: 'a1', overId: 'b', nest: false });
    expect(next.tree.map((n) => n.id)).toEqual(['a', 'a1', 'b']);
  });

  it('is a no-op when active === over', () => {
    const s = stateWith([node('a'), node('b')]);
    expect(appReducer(s, { type: 'MOVE_NODE', activeId: 'a', overId: 'a', nest: false })).toBe(s);
  });

  it('is a no-op when nesting into own descendant', () => {
    const s = stateWith(threeLevel());
    expect(appReducer(s, { type: 'MOVE_NODE', activeId: 'a', overId: 'c', nest: true })).toBe(s);
  });
});

describe('UNDO / REDO', () => {
  it('undo restores the previous tree + zoomPath and clears focus', () => {
    const s0 = stateWith([node('a')]);
    const s1 = appReducer(s0, { type: 'APPEND_CHILD', parentId: '__root__', newId: 'n' });
    expect(s1.tree.map((n) => n.id)).toEqual(['a', 'n']);
    const undone = appReducer(s1, { type: 'UNDO' });
    expect(undone.tree.map((n) => n.id)).toEqual(['a']);
    expect(undone.focusedId).toBeNull();
    expect(undone.history.future).toHaveLength(1);
  });

  it('redo re-applies the undone change', () => {
    const s0 = stateWith([node('a')]);
    const s1 = appReducer(s0, { type: 'APPEND_CHILD', parentId: '__root__', newId: 'n' });
    const undone = appReducer(s1, { type: 'UNDO' });
    const redone = appReducer(undone, { type: 'REDO' });
    expect(redone.tree.map((n) => n.id)).toEqual(['a', 'n']);
  });

  it('a new commit after undo clears the redo future', () => {
    const s0 = stateWith([node('a')]);
    const s1 = appReducer(s0, { type: 'APPEND_CHILD', parentId: '__root__', newId: 'n' });
    const undone = appReducer(s1, { type: 'UNDO' });
    expect(undone.history.future).toHaveLength(1);
    const committed = appReducer(undone, { type: 'TOGGLE_COMPLETE', id: 'a' });
    expect(committed.history.future).toHaveLength(0);
  });

  it('undo at empty history and redo at empty future are no-ops', () => {
    const s = stateWith([node('a')]);
    expect(appReducer(s, { type: 'UNDO' })).toBe(s);
    expect(appReducer(s, { type: 'REDO' })).toBe(s);
  });

  it(`caps history at MAX_HISTORY (${MAX_HISTORY}) snapshots`, () => {
    let s = stateWith([node('a')]);
    for (let i = 0; i < MAX_HISTORY + 5; i++) {
      s = appReducer(s, { type: 'TOGGLE_COMPLETE', id: 'a' });
    }
    expect(s.history.past).toHaveLength(MAX_HISTORY);
  });

  it('a shareToken set after the last snapshot survives an UNDO of an earlier action', () => {
    const s0 = stateWith([node('a')]);
    const s1 = appReducer(s0, { type: 'TOGGLE_COMPLETE', id: 'a' }); // withCommit, pushes a snapshot
    const s2 = appReducer(s1, { type: 'SET_NODE_SHARE', id: 'a', shareToken: 'tok' }); // not in history
    expect(s2.history.past).toHaveLength(1);
    const undone = appReducer(s2, { type: 'UNDO' });
    expect(undone.tree[0]!.completed).toBe(false); // the TOGGLE_COMPLETE was undone
    expect(undone.tree[0]!.shareToken).toBe('tok'); // but the share survives
  });

  it('a shareToken set after the last snapshot survives a REDO too', () => {
    const s0 = stateWith([node('a')]);
    const s1 = appReducer(s0, { type: 'TOGGLE_COMPLETE', id: 'a' });
    const undone = appReducer(s1, { type: 'UNDO' });
    const shared = appReducer(undone, { type: 'SET_NODE_SHARE', id: 'a', shareToken: 'tok' });
    const redone = appReducer(shared, { type: 'REDO' });
    expect(redone.tree[0]!.completed).toBe(true); // the TOGGLE_COMPLETE was redone
    expect(redone.tree[0]!.shareToken).toBe('tok'); // and the share still survives
  });

  it('SET_NODE_SHARE alone does not push a history snapshot', () => {
    const s0 = stateWith([node('a')]);
    const s1 = appReducer(s0, { type: 'SET_NODE_SHARE', id: 'a', shareToken: 'tok' });
    expect(s1.history.past).toHaveLength(0);
  });

  it('CLEAR_NODE_SHARES after a snapshot stays cleared through an unrelated UNDO', () => {
    const s0 = stateWith([node('a', [], { shareToken: 'tok' })]);
    const s1 = appReducer(s0, { type: 'TOGGLE_COMPLETE', id: 'a' }); // withCommit, snapshot has the token
    const s2 = appReducer(s1, { type: 'CLEAR_NODE_SHARES', id: 'a' }); // not in history
    expect(s2.tree[0]!.shareToken).toBeUndefined();
    const undone = appReducer(s2, { type: 'UNDO' });
    expect(undone.tree[0]!.completed).toBe(false); // the TOGGLE_COMPLETE was undone
    expect(undone.tree[0]!.shareToken).toBeUndefined(); // but the clear is not resurrected
  });
});

describe('RESTORE_HISTORY', () => {
  it('replaces history wholesale without touching tree/zoomPath/focus', () => {
    const s = stateWith([node('a')], { zoomPath: [], focusedId: 'a' });
    const savedHistory = { past: [{ tree: [node('old')], zoomPath: [] }], future: [] };
    const next = appReducer(s, { type: 'RESTORE_HISTORY', history: savedHistory });
    expect(next.history).toEqual(savedHistory);
    expect(next.tree).toBe(s.tree);
    expect(next.zoomPath).toBe(s.zoomPath);
    expect(next.focusedId).toBe('a');
  });
});

describe('HYDRATE', () => {
  it('loads tree, sanitizes zoomPath, merges settings over defaults, resets history', () => {
    const dirty = stateWith([node('old')], {
      history: { past: [{ tree: [node('x')], zoomPath: [] }], future: [] },
    });
    const next = appReducer(dirty, {
      type: 'HYDRATE',
      payload: {
        tree: threeLevel(),
        zoomPath: ['a', 'stale'],
        settings: { hideCompleted: true, theme: 'dark' },
      },
    });
    expect(ids(next.tree)).toEqual(['a', 'b', 'c']);
    expect(next.zoomPath).toEqual(['a']); // stale trimmed
    expect(next.settings).toEqual({ hideCompleted: true, theme: 'dark' });
    expect(next.history).toEqual({ past: [], future: [] });
  });

  it('falls back to the initial tree when payload tree is empty', () => {
    const s = stateWith([node('a')]);
    const next = appReducer(s, {
      type: 'HYDRATE',
      payload: { tree: [], zoomPath: [], settings: { hideCompleted: false, theme: 'light' } },
    });
    expect(next.tree).toBe(initialAppState.tree);
  });
});
