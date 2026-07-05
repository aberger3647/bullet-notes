import type { AppAction, BulletNode } from './types';
import { parseSearchQuery, nodeMatchesSearchQuery } from '../lib/searchQuery';

export function createNode(partial?: Partial<BulletNode>): BulletNode {
  return {
    id: crypto.randomUUID(),
    text: '',
    completed: false,
    children: [],
    ...partial,
  };
}

export type NodeLocation = {
  node: BulletNode;
  siblings: BulletNode[];
  index: number;
  parent: BulletNode | null;
};

/** Depth-first search for id; returns siblings array that contains the node */
export function locateNode(roots: BulletNode[], id: string): NodeLocation | null {
  const visit = (nodes: BulletNode[], parent: BulletNode | null): NodeLocation | null => {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.id === id) {
        return { node: n, siblings: nodes, index: i, parent };
      }
      const found = visit(n.children, n);
      if (found) return found;
    }
    return null;
  };
  return visit(roots, null);
}

export function findNodeById(roots: BulletNode[], id: string): BulletNode | null {
  return locateNode(roots, id)?.node ?? null;
}

/** True if id is the only top-level bullet in the document (deleting it is a no-op). */
export function isOnlyTopLevelNode(roots: BulletNode[], id: string): boolean {
  const loc = locateNode(roots, id);
  return loc !== null && !loc.parent && loc.siblings.length === 1;
}

/** Direct children shown for current zoom (invalid ids in path are ignored by trimming). */
export function getChildrenForZoom(roots: BulletNode[], zoomPath: string[]): BulletNode[] {
  let current: BulletNode[] = roots;
  for (const id of zoomPath) {
    const next = current.find((n) => n.id === id);
    if (!next) break;
    current = next.children;
  }
  return current;
}

export function sanitizeZoomPath(roots: BulletNode[], zoomPath: string[]): string[] {
  const out: string[] = [];
  let list = roots;
  for (const id of zoomPath) {
    const n = list.find((x) => x.id === id);
    if (!n) break;
    out.push(id);
    list = n.children;
  }
  return out;
}

export type SearchMatch = {
  id: string;
  text: string;
  breadcrumb: string[];
};

/** Zoom path to the parent list containing `id` (empty when `id` is top-level). */
export function getZoomPathToNode(roots: BulletNode[], id: string): string[] {
  const visit = (nodes: BulletNode[], ancestors: string[]): string[] | null => {
    for (const n of nodes) {
      if (n.id === id) return ancestors;
      const found = visit(n.children, [...ancestors, n.id]);
      if (found) return found;
    }
    return null;
  };
  return visit(roots, []) ?? [];
}

/** Ids of every node with children in the given forest. */
export function collectExpandableIds(nodes: BulletNode[]): string[] {
  const ids: string[] = [];
  const walk = (list: BulletNode[]) => {
    for (const n of list) {
      if (n.children.length > 0) {
        ids.push(n.id);
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return ids;
}

/** #tag tokens in `text` (lowercased, deduped, in first-seen order). */
export function extractTags(text: string): string[] {
  const matches = text.match(/#[a-zA-Z0-9_-]+/g) ?? [];
  const seen = new Set<string>();
  for (const m of matches) seen.add(m.slice(1).toLowerCase());
  return [...seen];
}

/** Every distinct #tag used anywhere in the tree, sorted alphabetically. */
export function collectAllTags(roots: BulletNode[]): string[] {
  const tags = new Set<string>();
  const walk = (nodes: BulletNode[]) => {
    for (const n of nodes) {
      for (const tag of extractTags(n.text)) tags.add(tag);
      walk(n.children);
    }
  };
  walk(roots);
  return [...tags].sort();
}

export function searchBullets(roots: BulletNode[], query: string): SearchMatch[] {
  const parsed = parseSearchQuery(query);
  if (parsed.alternatives.length === 0) return [];

  const results: SearchMatch[] = [];
  const walk = (nodes: BulletNode[], ancestorNodes: BulletNode[], ancestorLabels: string[]) => {
    for (const n of nodes) {
      const text = n.text.trim();
      if (text && nodeMatchesSearchQuery(n, ancestorNodes, parsed)) {
        results.push({ id: n.id, text, breadcrumb: ancestorLabels });
      }
      const label = text || 'Untitled';
      walk(n.children, [...ancestorNodes, n], [...ancestorLabels, label]);
    }
  };
  walk(roots, [], []);
  return results;
}

export function isDescendantOf(
  roots: BulletNode[],
  maybeDescendantId: string,
  ancestorId: string,
): boolean {
  const ancestor = findNodeById(roots, ancestorId);
  if (!ancestor) return false;
  const walk = (nodes: BulletNode[]): boolean => {
    for (const n of nodes) {
      if (n.id === maybeDescendantId) return true;
      if (walk(n.children)) return true;
    }
    return false;
  };
  return walk(ancestor.children);
}

/** Ids of nodes actually rendered, in on-screen (depth-first) order — for arrow-key navigation. */
export function getVisibleOrder(
  nodes: BulletNode[],
  expanded: Set<string>,
  hideCompleted: boolean,
): string[] {
  const out: string[] = [];
  const walk = (list: BulletNode[]) => {
    const visible = hideCompleted ? list.filter((n) => !n.completed) : list;
    for (const n of visible) {
      out.push(n.id);
      if (n.children.length > 0 && expanded.has(n.id)) {
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return out;
}

/** Hide completed nodes at each level (and thus their subtrees in this view). */
export function filterCompletedVisible(nodes: BulletNode[]): BulletNode[] {
  return nodes
    .filter((n) => !n.completed)
    .map((n) => ({
      ...n,
      children: filterCompletedVisible(n.children),
    }));
}

function replaceSiblings(
  roots: BulletNode[],
  targetSiblings: BulletNode[],
  next: BulletNode[],
): BulletNode[] {
  if (targetSiblings === roots) return next;
  const mapNodes = (nodes: BulletNode[]): BulletNode[] =>
    nodes.map((n) => {
      if (n.children === targetSiblings) {
        return { ...n, children: next };
      }
      return { ...n, children: mapNodes(n.children) };
    });
  return mapNodes(roots);
}

/** Remove node from tree (immutable), returns new roots */
export function removeNode(roots: BulletNode[], id: string): BulletNode[] {
  const loc = locateNode(roots, id);
  if (!loc) return roots;
  const nextSiblings = loc.siblings.filter((_, i) => i !== loc.index);
  return replaceSiblings(roots, loc.siblings, nextSiblings);
}

/** Insert `node` into `siblings` at `index` (immutable path to siblings). */
export function insertIntoSiblings(
  roots: BulletNode[],
  targetSiblings: BulletNode[],
  index: number,
  node: BulletNode,
): BulletNode[] {
  const copy = [...targetSiblings];
  copy.splice(index, 0, node);
  return replaceSiblings(roots, targetSiblings, copy);
}

/** Deep clone a subtree (for moves). */
export function cloneSubtree(node: BulletNode): BulletNode {
  return {
    ...node,
    children: node.children.map(cloneSubtree),
  };
}

/** Deep clone a subtree with a fresh id at every level (for duplication); drops shareToken. */
export function duplicateSubtree(node: BulletNode, genId: () => string): BulletNode {
  return {
    id: genId(),
    text: node.text,
    completed: node.completed,
    children: node.children.map((child) => duplicateSubtree(child, genId)),
  };
}

export function insertSiblingBefore(
  roots: BulletNode[],
  beforeId: string,
  newNode: BulletNode,
): BulletNode[] {
  const loc = locateNode(roots, beforeId);
  if (!loc) return roots;
  return insertIntoSiblings(roots, loc.siblings, loc.index, newNode);
}

export function insertSiblingAfter(
  roots: BulletNode[],
  afterId: string,
  newNode: BulletNode,
): BulletNode[] {
  const loc = locateNode(roots, afterId);
  if (!loc) return roots;
  return insertIntoSiblings(roots, loc.siblings, loc.index + 1, newNode);
}

export function insertSiblingsAfter(
  roots: BulletNode[],
  afterId: string,
  newNodes: BulletNode[],
): BulletNode[] {
  const loc = locateNode(roots, afterId);
  if (!loc) return roots;
  const copy = [...loc.siblings];
  copy.splice(loc.index + 1, 0, ...newNodes);
  return replaceSiblings(roots, loc.siblings, copy);
}

export function appendChild(roots: BulletNode[], parentId: string, child: BulletNode): BulletNode[] {
  const parentLoc = locateNode(roots, parentId);
  if (!parentLoc) return roots;
  const updatedParent: BulletNode = {
    ...parentLoc.node,
    children: [...parentLoc.node.children, child],
  };
  const sibs = [...parentLoc.siblings];
  sibs[parentLoc.index] = updatedParent;
  return replaceSiblings(roots, parentLoc.siblings, sibs);
}

export function indentNode(roots: BulletNode[], id: string): BulletNode[] {
  const loc = locateNode(roots, id);
  if (!loc || loc.index === 0) return roots;
  const prev = loc.siblings[loc.index - 1];
  const without = loc.siblings.filter((_, i) => i !== loc.index);
  const rootsAfterRemove = replaceSiblings(roots, loc.siblings, without);
  const newPrev: BulletNode = {
    ...prev,
    children: [...prev.children, loc.node],
  };
  const prevLoc = locateNode(rootsAfterRemove, prev.id);
  if (!prevLoc) return roots;
  const replacedPrevSiblings = [...prevLoc.siblings];
  replacedPrevSiblings[prevLoc.index] = newPrev;
  return replaceSiblings(rootsAfterRemove, prevLoc.siblings, replacedPrevSiblings);
}

export function outdentNode(roots: BulletNode[], id: string): BulletNode[] {
  const loc = locateNode(roots, id);
  if (!loc || !loc.parent) return roots;

  const parent = loc.parent;
  const parentLoc = locateNode(roots, parent.id);
  if (!parentLoc) return roots;

  const nextChildren = loc.siblings.filter((_, i) => i !== loc.index);
  const nextRoots = replaceSiblings(roots, loc.siblings, nextChildren);

  const parentLoc2 = locateNode(nextRoots, parent.id);
  if (!parentLoc2) return nextRoots;
  return insertIntoSiblings(nextRoots, parentLoc2.siblings, parentLoc2.index + 1, loc.node);
}

export function toggleComplete(roots: BulletNode[], id: string): BulletNode[] {
  const loc = locateNode(roots, id);
  if (!loc) return roots;
  const updated = { ...loc.node, completed: !loc.node.completed };
  const siblings = [...loc.siblings];
  siblings[loc.index] = updated;
  return replaceSiblings(roots, loc.siblings, siblings);
}

/** Sets `completed` on every id that currently differs (no-op for ids already at that state or missing). */
export function setNodesCompleted(roots: BulletNode[], ids: string[], completed: boolean): BulletNode[] {
  let next = roots;
  for (const id of ids) {
    const loc = locateNode(next, id);
    if (!loc || loc.node.completed === completed) continue;
    const updated = { ...loc.node, completed };
    const siblings = [...loc.siblings];
    siblings[loc.index] = updated;
    next = replaceSiblings(next, loc.siblings, siblings);
  }
  return next;
}

/**
 * Indents every id (expects top-to-bottom visible order). Indenting forward
 * lets later ids in the same original sibling run nest under the item just
 * indented before them, keeping the group's relative order intact.
 */
export function indentNodes(roots: BulletNode[], ids: string[]): BulletNode[] {
  let next = roots;
  for (const id of ids) next = indentNode(next, id);
  return next;
}

/**
 * Outdents every id (expects top-to-bottom visible order, iterates it in
 * reverse). `outdentNode` always inserts right after the shared parent, so
 * processing last-to-first is what keeps the group's relative order intact
 * instead of reversing it.
 */
export function outdentNodes(roots: BulletNode[], ids: string[]): BulletNode[] {
  let next = roots;
  for (let i = ids.length - 1; i >= 0; i--) next = outdentNode(next, ids[i]!);
  return next;
}

/**
 * Merge `id`'s text onto the end of `targetId`'s text and remove `id`.
 * `id`'s own children take its old slot among its former siblings (they do not
 * move under `targetId`), so joining a bullet with a distant/nested previous
 * row doesn't relocate its children into an unrelated part of the tree.
 */
export function mergeNodeIntoPrevious(
  roots: BulletNode[],
  id: string,
  targetId: string,
): BulletNode[] {
  if (id === targetId) return roots;
  const loc = locateNode(roots, id);
  if (!loc) return roots;
  if (!locateNode(roots, targetId)) return roots;

  const splicedSiblings = [
    ...loc.siblings.slice(0, loc.index),
    ...loc.node.children,
    ...loc.siblings.slice(loc.index + 1),
  ];
  const treeAfterRemoval = replaceSiblings(roots, loc.siblings, splicedSiblings);

  const targetLoc = locateNode(treeAfterRemoval, targetId);
  if (!targetLoc) return roots;
  const mergedTarget: BulletNode = { ...targetLoc.node, text: targetLoc.node.text + loc.node.text };
  const targetSiblings = [...targetLoc.siblings];
  targetSiblings[targetLoc.index] = mergedTarget;
  return replaceSiblings(treeAfterRemoval, targetLoc.siblings, targetSiblings);
}

export function setNodeText(roots: BulletNode[], id: string, text: string): BulletNode[] {
  const loc = locateNode(roots, id);
  if (!loc) return roots;
  const updated = { ...loc.node, text };
  const siblings = [...loc.siblings];
  siblings[loc.index] = updated;
  return replaceSiblings(roots, loc.siblings, siblings);
}

export function moveAsChild(
  roots: BulletNode[],
  activeId: string,
  newParentId: string,
): BulletNode[] {
  if (activeId === newParentId) return roots;
  if (isDescendantOf(roots, newParentId, activeId)) return roots;
  const activeLoc = locateNode(roots, activeId);
  const parentLoc = locateNode(roots, newParentId);
  if (!activeLoc || !parentLoc) return roots;
  const subtree = cloneSubtree(activeLoc.node);
  const roots2 = removeNode(roots, activeId);
  const parentAfter = locateNode(roots2, newParentId);
  if (!parentAfter) return roots;
  const newParent: BulletNode = {
    ...parentAfter.node,
    children: [...parentAfter.node.children, subtree],
  };
  const sibs = [...parentAfter.siblings];
  sibs[parentAfter.index] = newParent;
  return replaceSiblings(roots2, parentAfter.siblings, sibs);
}

/**
 * Move `activeId` to become a sibling of `overId` (inserted before it),
 * even if they're currently under different parents. This enables drag moves
 * to parent/grandparent/top-level levels without requiring a nest drop.
 */
export function moveBeforeSibling(
  roots: BulletNode[],
  activeId: string,
  overId: string,
): BulletNode[] {
  if (activeId === overId) return roots;
  const activeLoc = locateNode(roots, activeId);
  const overLoc = locateNode(roots, overId);
  if (!activeLoc || !overLoc) return roots;
  if (isDescendantOf(roots, overId, activeId)) return roots;

  const subtree = cloneSubtree(activeLoc.node);
  const roots2 = removeNode(roots, activeId);
  const overLoc2 = locateNode(roots2, overId);
  if (!overLoc2) return roots;

  return insertIntoSiblings(roots2, overLoc2.siblings, overLoc2.index, subtree);
}

/** Reorder among shared siblings (same parent list reference). */
export function reorderSiblings(roots: BulletNode[], activeId: string, overId: string): BulletNode[] {
  if (activeId === overId) return roots;
  const activeLoc = locateNode(roots, activeId);
  const overLoc = locateNode(roots, overId);
  if (!activeLoc || !overLoc || activeLoc.siblings !== overLoc.siblings) return roots;
  const oldIndex = activeLoc.index;
  const newIndex = overLoc.index;
  if (oldIndex === newIndex) return roots;
  const moved = arrayMove([...activeLoc.siblings], oldIndex, newIndex);
  return replaceSiblings(roots, activeLoc.siblings, moved);
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export type SharedRoot = { id: string; shareToken: string };

/** Every node that has been shared (has its own share link). */
export function collectSharedRoots(roots: BulletNode[]): SharedRoot[] {
  const out: SharedRoot[] = [];
  const walk = (nodes: BulletNode[]) => {
    for (const n of nodes) {
      if (n.shareToken) out.push({ id: n.id, shareToken: n.shareToken });
      walk(n.children);
    }
  };
  walk(roots);
  return out;
}

/** All shared roots whose subtree contains `nodeId` (for nested shares). */
export function getShareRootsForNode(roots: BulletNode[], nodeId: string): SharedRoot[] {
  const found: SharedRoot[] = [];
  const walk = (nodes: BulletNode[], ancestors: SharedRoot[]) => {
    for (const n of nodes) {
      const chain = n.shareToken ? [...ancestors, { id: n.id, shareToken: n.shareToken }] : ancestors;
      if (n.id === nodeId) {
        found.push(...chain);
        return;
      }
      walk(n.children, chain);
    }
  };
  walk(roots, []);
  return found;
}

/** Returns true if `nodeId` is the shared root or a descendant of it. */
export function isUnderSharedRoot(roots: BulletNode[], sharedRootId: string, nodeId: string): boolean {
  if (sharedRootId === nodeId) return true;
  const root = findNodeById(roots, sharedRootId);
  if (!root) return false;
  return findNodeById([root], nodeId) !== null;
}

/**
 * Fences a tree-mutation action to `rootId`'s own subtree, for the shared/collaborator
 * view where `rootId` must behave as if it has no parent and no siblings (it's really a
 * specific node inside someone else's full document). Without this, actions that treat
 * the shared root as an ordinary sibling-swappable node (e.g. "insert a sibling before
 * the first bullet in view") escape into whatever real position the root occupies —
 * landing as a new top-level bullet in the owner's document, or flattening the
 * recipient's own single-root tree into a multi-root one that then gets persisted as
 * the shared copy. Sibling-insert actions targeting `rootId` are rewritten into an
 * equivalent child-insert; actions with no safe rewrite are dropped (return null).
 */
export function clampActionToSharedRoot(
  roots: BulletNode[],
  action: AppAction,
  rootId: string,
): AppAction | null {
  switch (action.type) {
    case 'NEW_SIBLING_BEFORE':
      return action.beforeId === rootId
        ? { type: 'APPEND_CHILD', parentId: rootId, newId: action.newId }
        : action;
    case 'NEW_SIBLING_AFTER':
      return action.afterId === rootId
        ? { type: 'APPEND_CHILD', parentId: rootId, newId: action.newId }
        : action;
    case 'DUPLICATE_NODE':
      return action.id === rootId ? null : action;
    case 'PASTE_SUBTREE':
      return action.afterId === rootId ? null : action;
    case 'PASTE_OUTLINE':
      return action.afterId === rootId ? null : action;
    case 'INDENT':
    case 'OUTDENT':
    case 'DELETE_NODE':
      if (action.id === rootId) return null;
      if (action.type === 'OUTDENT' && locateNode(roots, action.id)?.parent?.id === rootId) return null;
      return action;
    case 'MOVE_NODE':
      if (action.activeId === rootId) return null;
      if (!action.nest && action.overId === rootId) return null;
      return action;
    default:
      return action;
  }
}

/** Extract a shared subtree as a single-root document for save/create. */
export function extractSharedSubtree(roots: BulletNode[], rootId: string): BulletNode[] {
  const node = findNodeById(roots, rootId);
  if (!node) return [];
  return [cloneSubtree(node)];
}

export function setNodeShareToken(roots: BulletNode[], id: string, shareToken: string): BulletNode[] {
  const loc = locateNode(roots, id);
  if (!loc) return roots;
  const updated = { ...loc.node, shareToken };
  const siblings = [...loc.siblings];
  siblings[loc.index] = updated;
  return replaceSiblings(roots, loc.siblings, siblings);
}

function stripShareToken(node: BulletNode): BulletNode {
  if (node.shareToken === undefined) return node;
  return { id: node.id, text: node.text, completed: node.completed, children: node.children };
}

function clearNodeShareToken(roots: BulletNode[], id: string): BulletNode[] {
  const loc = locateNode(roots, id);
  if (!loc || loc.node.shareToken === undefined) return roots;
  const siblings = [...loc.siblings];
  siblings[loc.index] = stripShareToken(loc.node);
  return replaceSiblings(roots, loc.siblings, siblings);
}

/**
 * Clear shareToken from `id` and every shared descendant beneath it (immutable).
 * Called before delete so an undo doesn't resurrect a share link that was just
 * revoked server-side.
 */
export function clearShareTokensInSubtree(roots: BulletNode[], id: string): BulletNode[] {
  const node = findNodeById(roots, id);
  if (!node) return roots;
  let next = roots;
  for (const shared of collectSharedRoots([node])) {
    next = clearNodeShareToken(next, shared.id);
  }
  return next;
}

/**
 * Clear shareToken from any node whose token is in `revokedTokens` (immutable).
 * Used after a version-history restore so a token captured before a revoke
 * doesn't resurrect a dead share link in the UI.
 */
export function clearRevokedShareTokens(roots: BulletNode[], revokedTokens: Set<string>): BulletNode[] {
  if (revokedTokens.size === 0) return roots;
  const strip = (node: BulletNode): BulletNode => {
    const children = node.children.map(strip);
    const stripped =
      node.shareToken !== undefined && revokedTokens.has(node.shareToken) ? stripShareToken(node) : node;
    return children === node.children && stripped === node ? node : { ...stripped, children };
  };
  return roots.map(strip);
}

function collectShareTokenMap(roots: BulletNode[]): Map<string, string | undefined> {
  const map = new Map<string, string | undefined>();
  const walk = (nodes: BulletNode[]) => {
    for (const n of nodes) {
      map.set(n.id, n.shareToken);
      walk(n.children);
    }
  };
  walk(roots);
  return map;
}

/**
 * Re-applies the live tree's shareToken values (by id) onto a tree being restored via
 * undo/redo. shareToken bookkeeping is intentionally excluded from undo history (it
 * mirrors server-side state, not user-authored content) — so swapping in an older
 * snapshot's structure must not silently resurrect a token that's since been committed
 * or revoked. Nodes absent from the live tree (genuinely deleted-and-undone) are left
 * exactly as the snapshot recorded them.
 */
export function reapplyLiveShareTokens(restoredTree: BulletNode[], liveTree: BulletNode[]): BulletNode[] {
  const liveTokens = collectShareTokenMap(liveTree);
  const apply = (node: BulletNode): BulletNode => {
    const children = node.children.map(apply);
    const liveToken = liveTokens.get(node.id);
    const reconciled: BulletNode =
      liveTokens.has(node.id) && liveToken !== node.shareToken
        ? liveToken === undefined
          ? { id: node.id, text: node.text, completed: node.completed, children: node.children }
          : { ...node, shareToken: liveToken }
        : node;
    return children === node.children && reconciled === node ? node : { ...reconciled, children };
  };
  return restoredTree.map(apply);
}

/** Custom clipboard MIME type used to round-trip a copied subtree (structure + text) between bullets. */
export const OUTLINE_CLIPBOARD_MIME = 'application/x-bullet-notes-outline';

/** Human-readable tab-indented fallback, for pasting a copied subtree into other apps. */
export function serializeOutlineClipboardText(node: BulletNode): string {
  const lines: string[] = [];
  const walk = (n: BulletNode, depth: number) => {
    lines.push('\t'.repeat(depth) + n.text.replace(/\n/g, ' '));
    n.children.forEach((child) => walk(child, depth + 1));
  };
  walk(node, 0);
  return lines.join('\n');
}

/** Structured payload for the custom clipboard MIME type — preserves nesting exactly. */
export function serializeOutlineClipboardJSON(node: BulletNode): string {
  return JSON.stringify(cloneSubtree(node));
}

/**
 * Tab-indented outline for a flat multi-id selection (whole-bullet range selection), in
 * the given order. Depth is relative — the shallowest selected bullet becomes indent 0.
 * Ids that no longer resolve in `roots` are skipped, not thrown.
 */
export function serializeSelectionClipboardText(roots: BulletNode[], ids: string[]): string {
  const resolved = ids
    .map((id) => {
      const n = findNodeById(roots, id);
      if (!n) return null;
      return { text: n.text, depth: getZoomPathToNode(roots, id).length };
    })
    .filter((r): r is { text: string; depth: number } => r !== null);
  if (resolved.length === 0) return '';
  const minDepth = Math.min(...resolved.map((r) => r.depth));
  return resolved.map((r) => '\t'.repeat(r.depth - minDepth) + r.text.replace(/\n/g, ' ')).join('\n');
}

function isBulletNodeShape(value: unknown): value is BulletNode {
  if (!value || typeof value !== 'object') return false;
  const n = value as Record<string, unknown>;
  return (
    typeof n.id === 'string' &&
    typeof n.text === 'string' &&
    typeof n.completed === 'boolean' &&
    Array.isArray(n.children) &&
    n.children.every(isBulletNodeShape)
  );
}

/** Parses our own outline clipboard payload; returns null for anything malformed/foreign. */
export function parseOutlineClipboardJSON(json: string): BulletNode | null {
  try {
    const parsed: unknown = JSON.parse(json);
    return isBulletNodeShape(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Title for a document, derived from its first top-level bullet's text. */
export function deriveDocTitle(roots: BulletNode[]): string {
  const raw = (roots[0]?.text ?? '').trim() || 'Untitled';
  const max = 56;
  return raw.length > max ? `${raw.slice(0, max)}…` : raw;
}

/** Collect node ids affected by an action (for routing broadcasts). */
export function getActionNodeIds(action: AppAction): string[] {
  switch (action.type) {
    case 'SET_TEXT':
    case 'TOGGLE_COMPLETE':
    case 'INDENT':
    case 'OUTDENT':
    case 'DELETE_NODE':
      return [action.id];
    case 'BULK_TOGGLE_COMPLETE':
    case 'BULK_INDENT':
    case 'BULK_OUTDENT':
      return action.ids;
    case 'MERGE_WITH_PREVIOUS':
      return [action.id, action.targetId];
    case 'DUPLICATE_NODE':
      return [action.id, ...(action.newId ? [action.newId] : [])];
    case 'PASTE_SUBTREE':
      return [action.afterId, ...(action.newId ? [action.newId] : [])];
    case 'PASTE_OUTLINE':
      return [action.afterId, ...(action.newId ? [action.newId] : [])];
    case 'NEW_SIBLING_AFTER':
      return [action.afterId, ...(action.newId ? [action.newId] : [])];
    case 'NEW_SIBLING_BEFORE':
      return [action.beforeId, ...(action.newId ? [action.newId] : [])];
    case 'APPEND_CHILD':
      return [action.parentId, ...(action.newId ? [action.newId] : [])];
    case 'MOVE_NODE':
      return [action.activeId, action.overId];
    default:
      return [];
  }
}
