import { describe, it, expect } from 'vitest';
import { node, threeLevel } from '../test/factories';
import type { AppAction, BulletNode } from './types';
import {
  createNode,
  locateNode,
  findNodeById,
  getChildrenForZoom,
  sanitizeZoomPath,
  getZoomPathToNode,
  collectExpandableIds,
  searchBullets,
  isDescendantOf,
  filterCompletedVisible,
  removeNode,
  insertIntoSiblings,
  cloneSubtree,
  insertSiblingBefore,
  insertSiblingAfter,
  appendChild,
  indentNode,
  outdentNode,
  toggleComplete,
  setNodeText,
  moveAsChild,
  moveBeforeSibling,
  reorderSiblings,
  collectSharedRoots,
  getShareRootsForNode,
  isUnderSharedRoot,
  extractSharedSubtree,
  setNodeShareToken,
  getActionNodeIds,
} from './treeOps';

/** Collect all ids in DFS order — handy for structural assertions. */
function ids(nodes: BulletNode[]): string[] {
  return nodes.flatMap((n) => [n.id, ...ids(n.children)]);
}

describe('createNode', () => {
  it('applies defaults', () => {
    const n = createNode();
    expect(n.text).toBe('');
    expect(n.completed).toBe(false);
    expect(n.children).toEqual([]);
    expect(typeof n.id).toBe('string');
    expect(n.id.length).toBeGreaterThan(0);
  });

  it('honors partial overrides including explicit id', () => {
    const n = createNode({ id: 'fixed', text: 'hi', completed: true });
    expect(n).toMatchObject({ id: 'fixed', text: 'hi', completed: true, children: [] });
  });
});

describe('locateNode', () => {
  it('locates a top-level node with null parent', () => {
    const tree = [node('a'), node('b')];
    const loc = locateNode(tree, 'b');
    expect(loc?.node.id).toBe('b');
    expect(loc?.index).toBe(1);
    expect(loc?.parent).toBeNull();
    expect(loc?.siblings).toBe(tree);
  });

  it('locates a deeply nested node with its parent + sibling array', () => {
    const tree = threeLevel(); // a > b > c
    const loc = locateNode(tree, 'c');
    expect(loc?.node.id).toBe('c');
    expect(loc?.parent?.id).toBe('b');
    expect(loc?.index).toBe(0);
  });

  it('returns null for a missing id', () => {
    expect(locateNode([node('a')], 'nope')).toBeNull();
  });
});

describe('findNodeById', () => {
  it('returns the node or null', () => {
    const tree = threeLevel();
    expect(findNodeById(tree, 'c')?.id).toBe('c');
    expect(findNodeById(tree, 'zz')).toBeNull();
  });
});

describe('getChildrenForZoom', () => {
  it('returns roots for an empty path', () => {
    const tree = [node('a'), node('b')];
    expect(getChildrenForZoom(tree, [])).toBe(tree);
  });

  it('returns the children at the zoomed level', () => {
    const tree = threeLevel(); // a > b > c
    expect(ids(getChildrenForZoom(tree, ['a']))).toEqual(['b', 'c']);
    expect(ids(getChildrenForZoom(tree, ['a', 'b']))).toEqual(['c']);
  });

  it('stops at the first invalid id in the path and returns that level', () => {
    const tree = threeLevel();
    // 'x' is not a child of 'a', so it stops after 'a' and returns a's children.
    expect(ids(getChildrenForZoom(tree, ['a', 'x']))).toEqual(['b', 'c']);
  });
});

describe('sanitizeZoomPath', () => {
  it('keeps a fully valid path', () => {
    const tree = threeLevel();
    expect(sanitizeZoomPath(tree, ['a', 'b'])).toEqual(['a', 'b']);
  });

  it('truncates at the first stale id', () => {
    const tree = threeLevel();
    expect(sanitizeZoomPath(tree, ['a', 'gone', 'b'])).toEqual(['a']);
  });

  it('returns empty for an empty path', () => {
    expect(sanitizeZoomPath(threeLevel(), [])).toEqual([]);
  });
});

describe('getZoomPathToNode', () => {
  it('returns [] for a top-level node (excludes the node itself)', () => {
    expect(getZoomPathToNode([node('a')], 'a')).toEqual([]);
  });

  it('returns the ancestor chain (not including the node)', () => {
    const tree = threeLevel(); // a > b > c
    expect(getZoomPathToNode(tree, 'c')).toEqual(['a', 'b']);
    expect(getZoomPathToNode(tree, 'b')).toEqual(['a']);
  });

  it('returns [] for a missing node', () => {
    expect(getZoomPathToNode(threeLevel(), 'missing')).toEqual([]);
  });
});

describe('collectExpandableIds', () => {
  it('returns only nodes with children, in DFS order, skipping leaves', () => {
    const tree = [node('a', [node('b', [node('c')])]), node('d')];
    expect(collectExpandableIds(tree)).toEqual(['a', 'b']);
  });
});

describe('isDescendantOf', () => {
  it('is true for a nested descendant', () => {
    expect(isDescendantOf(threeLevel(), 'c', 'a')).toBe(true);
  });

  it('is false for a non-descendant and for a missing ancestor', () => {
    const tree = [node('a', [node('b')]), node('x')];
    expect(isDescendantOf(tree, 'x', 'a')).toBe(false);
    expect(isDescendantOf(tree, 'b', 'missing')).toBe(false);
  });

  it('is false for the node itself (strict descendant)', () => {
    expect(isDescendantOf(threeLevel(), 'a', 'a')).toBe(false);
  });
});

describe('filterCompletedVisible', () => {
  it('removes completed nodes at each level', () => {
    const tree = [node('a'), node('b', [], { completed: true }), node('c')];
    expect(ids(filterCompletedVisible(tree))).toEqual(['a', 'c']);
  });

  it('hides an incomplete child when its parent is completed (subtree drops out)', () => {
    // Spec-decision: a completed parent removes its whole subtree from this view.
    const tree = [node('p', [node('kid')], { completed: true })];
    expect(filterCompletedVisible(tree)).toEqual([]);
  });

  it('does not mutate the input', () => {
    const tree = [node('a', [], { completed: true })];
    filterCompletedVisible(tree);
    expect(tree).toHaveLength(1);
  });
});

describe('removeNode', () => {
  it('removes a nested node', () => {
    const tree = threeLevel();
    expect(ids(removeNode(tree, 'c'))).toEqual(['a', 'b']);
  });

  it('removes a top-level node', () => {
    const tree = [node('a'), node('b')];
    expect(ids(removeNode(tree, 'a'))).toEqual(['b']);
  });

  it('returns the same reference for a missing id', () => {
    const tree = [node('a')];
    expect(removeNode(tree, 'nope')).toBe(tree);
  });
});

describe('insertIntoSiblings', () => {
  it('inserts at the given index', () => {
    const tree = [node('a'), node('c')];
    const next = insertIntoSiblings(tree, tree, 1, node('b'));
    expect(ids(next)).toEqual(['a', 'b', 'c']);
  });
});

describe('cloneSubtree', () => {
  it('deep-copies with fresh references at every level', () => {
    const original = node('a', [node('b', [node('c')])]);
    const clone = cloneSubtree(original);
    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
    expect(clone.children[0]).not.toBe(original.children[0]);
    expect(clone.children[0]!.children[0]).not.toBe(original.children[0]!.children[0]);
  });
});

describe('insertSiblingBefore / insertSiblingAfter', () => {
  it('inserts before the target', () => {
    const tree = [node('a'), node('b')];
    expect(ids(insertSiblingBefore(tree, 'b', node('x')))).toEqual(['a', 'x', 'b']);
  });

  it('inserts after the target', () => {
    const tree = [node('a'), node('b')];
    expect(ids(insertSiblingAfter(tree, 'a', node('x')))).toEqual(['a', 'x', 'b']);
  });

  it('returns the same reference when the target is missing', () => {
    const tree = [node('a')];
    expect(insertSiblingBefore(tree, 'nope', node('x'))).toBe(tree);
    expect(insertSiblingAfter(tree, 'nope', node('x'))).toBe(tree);
  });
});

describe('appendChild', () => {
  it('appends as the last child of the parent', () => {
    const tree = [node('a', [node('a1')])];
    const next = appendChild(tree, 'a', node('a2'));
    expect(ids(next)).toEqual(['a', 'a1', 'a2']);
  });

  it('returns the same reference when the parent is missing', () => {
    const tree = [node('a')];
    expect(appendChild(tree, 'nope', node('x'))).toBe(tree);
  });
});

describe('indentNode', () => {
  it('moves a node under its previous sibling as the last child', () => {
    const tree = [node('a'), node('b')];
    const next = indentNode(tree, 'b');
    expect(ids(next)).toEqual(['a', 'b']);
    expect(next[0]!.children.map((n) => n.id)).toEqual(['b']);
  });

  it('carries the indented node’s own subtree along', () => {
    const tree = [node('a'), node('b', [node('b1')])];
    const next = indentNode(tree, 'b');
    expect(ids(next)).toEqual(['a', 'b', 'b1']);
  });

  it('is a no-op (same reference) for a first sibling', () => {
    const tree = [node('a'), node('b')];
    expect(indentNode(tree, 'a')).toBe(tree);
  });

  it('returns the same reference for a missing id', () => {
    const tree = [node('a')];
    expect(indentNode(tree, 'nope')).toBe(tree);
  });
});

describe('outdentNode', () => {
  it('moves a nested node to be the next sibling of its parent', () => {
    const tree = [node('a', [node('a1'), node('a2')]), node('b')];
    const next = outdentNode(tree, 'a1');
    // a1 leaves a's children and lands right after a.
    expect(ids(next)).toEqual(['a', 'a2', 'a1', 'b']);
    expect(next.map((n) => n.id)).toEqual(['a', 'a1', 'b']);
  });

  it('is a no-op (same reference) for a root-level node with no parent', () => {
    const tree = [node('a'), node('b')];
    expect(outdentNode(tree, 'a')).toBe(tree);
  });

  it('returns the same reference for a missing id', () => {
    const tree = [node('a', [node('a1')])];
    expect(outdentNode(tree, 'nope')).toBe(tree);
  });
});

describe('toggleComplete', () => {
  it('flips the completed flag', () => {
    const tree = [node('a')];
    expect(toggleComplete(tree, 'a')[0]!.completed).toBe(true);
    expect(toggleComplete(toggleComplete(tree, 'a'), 'a')[0]!.completed).toBe(false);
  });

  it('returns the same reference for a missing id', () => {
    const tree = [node('a')];
    expect(toggleComplete(tree, 'nope')).toBe(tree);
  });
});

describe('setNodeText', () => {
  it('updates the text', () => {
    const tree = [node('a', [], { text: 'old' })];
    expect(setNodeText(tree, 'a', 'new')[0]!.text).toBe('new');
  });

  it('returns the same reference for a missing id', () => {
    const tree = [node('a')];
    expect(setNodeText(tree, 'nope', 'x')).toBe(tree);
  });
});

describe('moveAsChild', () => {
  it('moves a node to become the last child of the new parent', () => {
    const tree = [node('a', [node('a1')]), node('b')];
    const next = moveAsChild(tree, 'b', 'a');
    expect(next.map((n) => n.id)).toEqual(['a']);
    expect(next[0]!.children.map((n) => n.id)).toEqual(['a1', 'b']);
  });

  it('is a no-op when moving a node into itself', () => {
    const tree = [node('a')];
    expect(moveAsChild(tree, 'a', 'a')).toBe(tree);
  });

  it('is a no-op when moving a node into its own descendant', () => {
    const tree = threeLevel(); // a > b > c
    expect(moveAsChild(tree, 'a', 'c')).toBe(tree);
  });

  it('returns the same reference when a node is missing', () => {
    const tree = [node('a')];
    expect(moveAsChild(tree, 'a', 'nope')).toBe(tree);
  });
});

describe('moveBeforeSibling', () => {
  it('moves a node before the target across parents', () => {
    const tree = [node('a', [node('a1')]), node('b')];
    const next = moveBeforeSibling(tree, 'a1', 'b');
    expect(next.map((n) => n.id)).toEqual(['a', 'a1', 'b']);
    expect(next[0]!.children).toEqual([]);
  });

  it('is a no-op when moving before its own descendant', () => {
    const tree = threeLevel();
    expect(moveBeforeSibling(tree, 'a', 'c')).toBe(tree);
  });

  it('returns the same reference for a missing node', () => {
    const tree = [node('a'), node('b')];
    expect(moveBeforeSibling(tree, 'a', 'nope')).toBe(tree);
  });
});

describe('reorderSiblings', () => {
  it('reorders within the same sibling list', () => {
    const tree = [node('a'), node('b'), node('c')];
    expect(ids(reorderSiblings(tree, 'a', 'c'))).toEqual(['b', 'c', 'a']);
  });

  it('returns the same reference across different parents (caller falls back)', () => {
    const tree = [node('a', [node('a1')]), node('b')];
    expect(reorderSiblings(tree, 'a1', 'b')).toBe(tree);
  });

  it('returns the same reference when active === over', () => {
    const tree = [node('a'), node('b')];
    expect(reorderSiblings(tree, 'a', 'a')).toBe(tree);
  });
});

describe('share helpers', () => {
  const shared = () => [
    node('a', [node('a1', [node('a1a')], { shareToken: 'tokA1' })], { shareToken: 'tokA' }),
    node('b'),
  ];

  it('collectSharedRoots returns every tokened node in DFS order', () => {
    expect(collectSharedRoots(shared())).toEqual([
      { id: 'a', shareToken: 'tokA' },
      { id: 'a1', shareToken: 'tokA1' },
    ]);
  });

  it('getShareRootsForNode returns the ancestor share chain (outer→inner)', () => {
    expect(getShareRootsForNode(shared(), 'a1a')).toEqual([
      { id: 'a', shareToken: 'tokA' },
      { id: 'a1', shareToken: 'tokA1' },
    ]);
  });

  it('getShareRootsForNode returns [] for an unshared branch', () => {
    expect(getShareRootsForNode(shared(), 'b')).toEqual([]);
  });

  it('isUnderSharedRoot is true for self and descendants, false otherwise', () => {
    const tree = shared();
    expect(isUnderSharedRoot(tree, 'a', 'a')).toBe(true);
    expect(isUnderSharedRoot(tree, 'a', 'a1a')).toBe(true);
    expect(isUnderSharedRoot(tree, 'a', 'b')).toBe(false);
    expect(isUnderSharedRoot(tree, 'missing', 'b')).toBe(false);
  });

  it('extractSharedSubtree returns a single cloned root document', () => {
    const tree = shared();
    const extracted = extractSharedSubtree(tree, 'a1');
    expect(extracted).toHaveLength(1);
    expect(extracted[0]!.id).toBe('a1');
    expect(ids(extracted)).toEqual(['a1', 'a1a']);
    expect(extracted[0]).not.toBe(findNodeByIdInTree(tree, 'a1'));
  });

  it('extractSharedSubtree returns [] for a missing root', () => {
    expect(extractSharedSubtree(shared(), 'nope')).toEqual([]);
  });

  it('setNodeShareToken sets the token', () => {
    const tree = [node('a')];
    expect(setNodeShareToken(tree, 'a', 'tk')[0]!.shareToken).toBe('tk');
  });

  it('setNodeShareToken returns the same reference for a missing id', () => {
    const tree = [node('a')];
    expect(setNodeShareToken(tree, 'nope', 'tk')).toBe(tree);
  });
});

describe('searchBullets', () => {
  const tree = () => [
    node('p', [node('c1', [], { text: 'buy milk' }), node('c2', [], { text: 'buy eggs' })], {
      text: 'groceries',
    }),
    node('e', [], { text: '' }),
  ];

  it('returns matches with breadcrumb ancestor labels', () => {
    const results = searchBullets(tree(), 'milk');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ id: 'c1', text: 'buy milk', breadcrumb: ['groceries'] });
  });

  it('skips nodes with empty text', () => {
    // 'e' has empty text, so even a broad query never returns it.
    expect(searchBullets(tree(), 'buy').map((r) => r.id).sort()).toEqual(['c1', 'c2']);
  });

  it('returns [] for an empty query', () => {
    expect(searchBullets(tree(), '   ')).toEqual([]);
  });
});

describe('getActionNodeIds', () => {
  const cases: Array<[AppAction, string[]]> = [
    [{ type: 'SET_TEXT', id: 'x', text: 't' }, ['x']],
    [{ type: 'TOGGLE_COMPLETE', id: 'x' }, ['x']],
    [{ type: 'INDENT', id: 'x' }, ['x']],
    [{ type: 'OUTDENT', id: 'x' }, ['x']],
    [{ type: 'DELETE_NODE', id: 'x' }, ['x']],
    [{ type: 'NEW_SIBLING_AFTER', afterId: 'x', newId: 'n' }, ['x', 'n']],
    [{ type: 'NEW_SIBLING_AFTER', afterId: 'x' }, ['x']],
    [{ type: 'NEW_SIBLING_BEFORE', beforeId: 'x', newId: 'n' }, ['x', 'n']],
    [{ type: 'APPEND_CHILD', parentId: 'x', newId: 'n' }, ['x', 'n']],
    [{ type: 'APPEND_CHILD', parentId: 'x' }, ['x']],
    [{ type: 'MOVE_NODE', activeId: 'a', overId: 'o', nest: false }, ['a', 'o']],
    [{ type: 'ZOOM_BACK' }, []],
    [{ type: 'UNDO' }, []],
  ];

  it.each(cases)('maps %o -> %o', (action, expected) => {
    expect(getActionNodeIds(action)).toEqual(expected);
  });
});

// Local helper: locateNode-based lookup, kept out of the share describe closure.
function findNodeByIdInTree(tree: BulletNode[], id: string): BulletNode | null {
  return findNodeById(tree, id);
}
