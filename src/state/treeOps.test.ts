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
  insertSiblingsAfter,
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
  duplicateSubtree,
  getVisibleOrder,
  mergeNodeIntoPrevious,
  serializeOutlineClipboardText,
  serializeOutlineClipboardJSON,
  parseOutlineClipboardJSON,
  OUTLINE_CLIPBOARD_MIME,
  extractTags,
  collectAllTags,
  deriveDocTitle,
  clampActionToSharedRoot,
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

describe('insertSiblingsAfter', () => {
  it('inserts multiple nodes in order after the target', () => {
    const tree = [node('a'), node('b')];
    expect(ids(insertSiblingsAfter(tree, 'a', [node('x'), node('y')]))).toEqual(['a', 'x', 'y', 'b']);
  });

  it('inserts correctly when the target is the last sibling', () => {
    const tree = [node('a'), node('b')];
    expect(ids(insertSiblingsAfter(tree, 'b', [node('x'), node('y')]))).toEqual(['a', 'b', 'x', 'y']);
  });

  it('returns the same reference when the target is missing', () => {
    const tree = [node('a')];
    expect(insertSiblingsAfter(tree, 'nope', [node('x')])).toBe(tree);
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

describe('duplicateSubtree', () => {
  it('deep-copies content but assigns a fresh id at every level', () => {
    const original = node('a', [node('b', [node('c')])], { text: 'root', completed: true });
    const dup = duplicateSubtree(original, () => 'new-id');
    expect(dup.id).not.toBe('a');
    expect(dup.text).toBe('root');
    expect(dup.completed).toBe(true);
    expect(dup.children[0]!.id).not.toBe('b');
    expect(dup.children[0]!.children[0]!.id).not.toBe('c');
  });

  it('drops any shareToken on the duplicate (it is not the shared node)', () => {
    const original = node('a', [], { shareToken: 'tok' });
    const dup = duplicateSubtree(original, () => 'new-id');
    expect(dup.shareToken).toBeUndefined();
  });

  it('uses the id generator for every node in the subtree, in DFS order', () => {
    const original = node('a', [node('b'), node('c')]);
    const ids = ['id-a', 'id-b', 'id-c'];
    let i = 0;
    const dup = duplicateSubtree(original, () => ids[i++]!);
    expect(dup.id).toBe('id-a');
    expect(dup.children[0]!.id).toBe('id-b');
    expect(dup.children[1]!.id).toBe('id-c');
  });
});

describe('getVisibleOrder', () => {
  it('lists top-level nodes in order when nothing is expanded', () => {
    const tree = [node('a', [node('a1')]), node('b')];
    expect(getVisibleOrder(tree, new Set(), false)).toEqual(['a', 'b']);
  });

  it('inlines children of expanded nodes, depth-first', () => {
    const tree = [node('a', [node('a1'), node('a2')]), node('b')];
    expect(getVisibleOrder(tree, new Set(['a']), false)).toEqual(['a', 'a1', 'a2', 'b']);
  });

  it('does not descend into a collapsed node even if it has children', () => {
    const tree = [node('a', [node('a1', [node('a1a')])]), node('b')];
    expect(getVisibleOrder(tree, new Set(['a']), false)).toEqual(['a', 'a1', 'b']);
    expect(getVisibleOrder(tree, new Set(['a', 'a1']), false)).toEqual(['a', 'a1', 'a1a', 'b']);
  });

  it('skips completed nodes (and their subtrees) when hideCompleted is set', () => {
    const tree = [node('a', [node('a1')], { completed: true }), node('b')];
    expect(getVisibleOrder(tree, new Set(['a']), true)).toEqual(['b']);
  });
});

describe('mergeNodeIntoPrevious', () => {
  it('appends the text onto the target and removes the merged node', () => {
    const tree = [node('a', [], { text: 'foo' }), node('b', [], { text: 'bar' })];
    const next = mergeNodeIntoPrevious(tree, 'b', 'a');
    expect(next.map((n) => n.id)).toEqual(['a']);
    expect(next[0]!.text).toBe('foobar');
  });

  it("splices the merged node's children into its own old slot (not under the target)", () => {
    const tree = [node('a', [], { text: 'foo' }), node('b', [node('b1')], { text: 'bar' })];
    const next = mergeNodeIntoPrevious(tree, 'b', 'a');
    expect(next.map((n) => n.id)).toEqual(['a', 'b1']);
    expect(next[0]!.text).toBe('foobar');
    expect(next[0]!.children).toEqual([]);
  });

  it('merging into the parent (first child, no previous sibling) preserves sibling order', () => {
    const tree = [node('p', [node('a', [], { text: 'A' }), node('c', [], { text: 'C' })], { text: 'P' })];
    const next = mergeNodeIntoPrevious(tree, 'a', 'p');
    expect(next[0]!.text).toBe('PA');
    expect(next[0]!.children.map((n) => n.id)).toEqual(['c']);
  });

  it("splices a merged first child's own children in before its remaining siblings", () => {
    const tree = [
      node('p', [node('a', [node('a1')], { text: 'A' }), node('c', [], { text: 'C' })], { text: 'P' }),
    ];
    const next = mergeNodeIntoPrevious(tree, 'a', 'p');
    expect(next[0]!.children.map((n) => n.id)).toEqual(['a1', 'c']);
  });

  it('returns the same reference when the merged node or target is missing', () => {
    const tree = [node('a')];
    expect(mergeNodeIntoPrevious(tree, 'nope', 'a')).toBe(tree);
    expect(mergeNodeIntoPrevious(tree, 'a', 'nope')).toBe(tree);
  });

  it('is a no-op when id === targetId', () => {
    const tree = [node('a')];
    expect(mergeNodeIntoPrevious(tree, 'a', 'a')).toBe(tree);
  });
});

describe('outline clipboard serialization', () => {
  it('serializes a subtree to a readable tab-indented outline for pasting into other apps', () => {
    const tree = node('a', [node('b'), node('c', [node('d')])], { text: 'root' });
    expect(serializeOutlineClipboardText(tree)).toBe('root\n\tb\n\tc\n\t\td');
  });

  it('flattens embedded newlines in the readable outline (one line per bullet)', () => {
    const tree = node('a', [], { text: 'line1\nline2' });
    expect(serializeOutlineClipboardText(tree)).toBe('line1 line2');
  });

  it('round-trips a subtree through JSON serialize/parse', () => {
    const tree = node('a', [node('b', [], { text: 'child' })], { text: 'root' });
    const json = serializeOutlineClipboardJSON(tree);
    const parsed = parseOutlineClipboardJSON(json);
    expect(parsed).toEqual(tree);
  });

  it('returns null for malformed or non-outline JSON', () => {
    expect(parseOutlineClipboardJSON('not json')).toBeNull();
    expect(parseOutlineClipboardJSON('{"foo":"bar"}')).toBeNull();
    expect(parseOutlineClipboardJSON('42')).toBeNull();
  });

  it('exposes the custom clipboard mime type used to detect our own paste payloads', () => {
    expect(OUTLINE_CLIPBOARD_MIME).toBe('application/x-bullet-notes-outline');
  });
});

describe('extractTags', () => {
  it('extracts #tag tokens (lowercased, deduped)', () => {
    expect(extractTags('buy milk #groceries #Urgent #groceries')).toEqual(['groceries', 'urgent']);
  });

  it('ignores a bare "#" or markdown-heading-style "# text"', () => {
    expect(extractTags('# Heading')).toEqual([]);
    expect(extractTags('just a # by itself')).toEqual([]);
  });

  it('allows hyphens and underscores in tag names', () => {
    expect(extractTags('#work-in_progress')).toEqual(['work-in_progress']);
  });

  it('returns [] for text with no tags', () => {
    expect(extractTags('nothing here')).toEqual([]);
  });
});

describe('collectAllTags', () => {
  it('collects and sorts unique tags across the whole tree', () => {
    const tree = [
      node('a', [node('b', [], { text: 'child #beta' })], { text: 'root #alpha' }),
      node('c', [], { text: 'second #alpha #gamma' }),
    ];
    expect(collectAllTags(tree)).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('returns [] when no bullet has a tag', () => {
    expect(collectAllTags([node('a', [], { text: 'plain' })])).toEqual([]);
  });
});

describe('deriveDocTitle', () => {
  it("uses the first top-level bullet's text, truncated", () => {
    expect(deriveDocTitle([node('a', [], { text: 'My groceries list' })])).toBe('My groceries list');
  });

  it('falls back to "Untitled" for an empty or blank first bullet', () => {
    expect(deriveDocTitle([node('a', [], { text: '' })])).toBe('Untitled');
    expect(deriveDocTitle([])).toBe('Untitled');
  });

  it('truncates long titles', () => {
    const long = 'x'.repeat(80);
    expect(deriveDocTitle([node('a', [], { text: long })])).toBe(`${'x'.repeat(56)}…`);
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
    [{ type: 'BULK_TOGGLE_COMPLETE', ids: ['x', 'y'] }, ['x', 'y']],
    [{ type: 'BULK_INDENT', ids: ['x', 'y'] }, ['x', 'y']],
    [{ type: 'BULK_OUTDENT', ids: ['x', 'y'] }, ['x', 'y']],
    [{ type: 'NEW_SIBLING_AFTER', afterId: 'x', newId: 'n' }, ['x', 'n']],
    [{ type: 'NEW_SIBLING_AFTER', afterId: 'x' }, ['x']],
    [{ type: 'NEW_SIBLING_BEFORE', beforeId: 'x', newId: 'n' }, ['x', 'n']],
    [{ type: 'APPEND_CHILD', parentId: 'x', newId: 'n' }, ['x', 'n']],
    [{ type: 'APPEND_CHILD', parentId: 'x' }, ['x']],
    [{ type: 'MOVE_NODE', activeId: 'a', overId: 'o', nest: false }, ['a', 'o']],
    [{ type: 'MERGE_WITH_PREVIOUS', id: 'x', targetId: 'y' }, ['x', 'y']],
    [{ type: 'DUPLICATE_NODE', id: 'x', newId: 'n' }, ['x', 'n']],
    [{ type: 'DUPLICATE_NODE', id: 'x' }, ['x']],
    [{ type: 'PASTE_SUBTREE', afterId: 'x', subtree: node('p'), newId: 'n' }, ['x', 'n']],
    [{ type: 'PASTE_SUBTREE', afterId: 'x', subtree: node('p') }, ['x']],
    [{ type: 'PASTE_OUTLINE', afterId: 'x', roots: [node('p')], newId: 'n' }, ['x', 'n']],
    [{ type: 'PASTE_OUTLINE', afterId: 'x', roots: [node('p')] }, ['x']],
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

describe('clampActionToSharedRoot', () => {
  // Single-root shared view: root -> child -> grandchild.
  const tree = () => [node('root', [node('child', [node('grandchild')])])];

  it('rewrites NEW_SIBLING_BEFORE targeting the root into an APPEND_CHILD', () => {
    const action: AppAction = { type: 'NEW_SIBLING_BEFORE', beforeId: 'root', newId: 'n' };
    expect(clampActionToSharedRoot(tree(), action, 'root')).toEqual({
      type: 'APPEND_CHILD',
      parentId: 'root',
      newId: 'n',
    });
  });

  it('rewrites NEW_SIBLING_AFTER targeting the root into an APPEND_CHILD', () => {
    const action: AppAction = { type: 'NEW_SIBLING_AFTER', afterId: 'root', newId: 'n' };
    expect(clampActionToSharedRoot(tree(), action, 'root')).toEqual({
      type: 'APPEND_CHILD',
      parentId: 'root',
      newId: 'n',
    });
  });

  it('leaves NEW_SIBLING_BEFORE/AFTER targeting a non-root node unchanged', () => {
    const before: AppAction = { type: 'NEW_SIBLING_BEFORE', beforeId: 'child', newId: 'n' };
    const after: AppAction = { type: 'NEW_SIBLING_AFTER', afterId: 'child', newId: 'n' };
    expect(clampActionToSharedRoot(tree(), before, 'root')).toEqual(before);
    expect(clampActionToSharedRoot(tree(), after, 'root')).toEqual(after);
  });

  it('drops DUPLICATE_NODE / PASTE_SUBTREE / PASTE_OUTLINE targeting the root', () => {
    const dup: AppAction = { type: 'DUPLICATE_NODE', id: 'root', newId: 'n' };
    const paste: AppAction = { type: 'PASTE_SUBTREE', afterId: 'root', subtree: node('p'), newId: 'n' };
    const pasteOutline: AppAction = { type: 'PASTE_OUTLINE', afterId: 'root', roots: [node('p')], newId: 'n' };
    expect(clampActionToSharedRoot(tree(), dup, 'root')).toBeNull();
    expect(clampActionToSharedRoot(tree(), paste, 'root')).toBeNull();
    expect(clampActionToSharedRoot(tree(), pasteOutline, 'root')).toBeNull();
  });

  it('leaves DUPLICATE_NODE / PASTE_OUTLINE targeting a non-root node unchanged', () => {
    const dup: AppAction = { type: 'DUPLICATE_NODE', id: 'child', newId: 'n' };
    const pasteOutline: AppAction = { type: 'PASTE_OUTLINE', afterId: 'child', roots: [node('p')], newId: 'n' };
    expect(clampActionToSharedRoot(tree(), dup, 'root')).toEqual(dup);
    expect(clampActionToSharedRoot(tree(), pasteOutline, 'root')).toEqual(pasteOutline);
  });

  it('drops OUTDENT for the root itself and for a direct child of the root', () => {
    expect(clampActionToSharedRoot(tree(), { type: 'OUTDENT', id: 'root' }, 'root')).toBeNull();
    expect(clampActionToSharedRoot(tree(), { type: 'OUTDENT', id: 'child' }, 'root')).toBeNull();
  });

  it('leaves OUTDENT for a grandchild (parent is not the root) unchanged', () => {
    const action: AppAction = { type: 'OUTDENT', id: 'grandchild' };
    expect(clampActionToSharedRoot(tree(), action, 'root')).toEqual(action);
  });

  it('drops INDENT / DELETE_NODE for the root itself', () => {
    expect(clampActionToSharedRoot(tree(), { type: 'INDENT', id: 'root' }, 'root')).toBeNull();
    expect(clampActionToSharedRoot(tree(), { type: 'DELETE_NODE', id: 'root' }, 'root')).toBeNull();
  });

  it('leaves INDENT / DELETE_NODE for a non-root node unchanged', () => {
    const indent: AppAction = { type: 'INDENT', id: 'child' };
    const del: AppAction = { type: 'DELETE_NODE', id: 'child' };
    expect(clampActionToSharedRoot(tree(), indent, 'root')).toEqual(indent);
    expect(clampActionToSharedRoot(tree(), del, 'root')).toEqual(del);
  });

  it('drops MOVE_NODE when the root is the node being moved', () => {
    const action: AppAction = { type: 'MOVE_NODE', activeId: 'root', overId: 'child', nest: false };
    expect(clampActionToSharedRoot(tree(), action, 'root')).toBeNull();
  });

  it('drops a non-nesting MOVE_NODE that would reorder something to become a sibling of the root', () => {
    const action: AppAction = { type: 'MOVE_NODE', activeId: 'grandchild', overId: 'root', nest: false };
    expect(clampActionToSharedRoot(tree(), action, 'root')).toBeNull();
  });

  it('allows nesting a node as a child of the root via MOVE_NODE', () => {
    const action: AppAction = { type: 'MOVE_NODE', activeId: 'grandchild', overId: 'root', nest: true };
    expect(clampActionToSharedRoot(tree(), action, 'root')).toEqual(action);
  });

  it('passes through unrelated actions unchanged', () => {
    const action: AppAction = { type: 'SET_TEXT', id: 'root', text: 'hi' };
    expect(clampActionToSharedRoot(tree(), action, 'root')).toEqual(action);
  });
});
