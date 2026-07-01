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

  it('recomputes zoomPath when the outdented node leaves the current view', () => {
    // Viewing b's children (['c']); outdent c so it becomes a sibling of b under a.
    const s = stateWith(threeLevel(), { zoomPath: ['a', 'b'] });
    const next = appReducer(s, { type: 'OUTDENT', id: 'c' });
    expect(next.zoomPath).toEqual(['a']); // c is now a child of a
    expect(getChildrenForZoom(next.tree, next.zoomPath).some((n) => n.id === 'c')).toBe(true);
  });

  it('is a no-op for a root-level node', () => {
    const s = stateWith([node('a'), node('b')]);
    expect(appReducer(s, { type: 'OUTDENT', id: 'a' })).toBe(s);
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
