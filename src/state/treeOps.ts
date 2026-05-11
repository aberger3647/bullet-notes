import type { BulletNode } from './types';

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

export function insertSiblingAfter(
  roots: BulletNode[],
  afterId: string,
  newNode: BulletNode,
): BulletNode[] {
  const loc = locateNode(roots, afterId);
  if (!loc) return roots;
  return insertIntoSiblings(roots, loc.siblings, loc.index + 1, newNode);
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
