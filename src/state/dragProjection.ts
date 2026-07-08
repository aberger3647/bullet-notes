import type { FlattenedRow } from './treeOps';

/** Must track `.outline-children`'s `padding-left: 1.5rem` in App.css. */
export const INDENT_WIDTH_PX = 24;

/** Horizontal pointer offset → depth delta, given one indent level's pixel width. */
export function getDragDepth(offset: number, indentationWidth: number): number {
  return Math.round(offset / indentationWidth);
}

function getMaxDepth(previousItem?: FlattenedRow): number {
  return previousItem ? previousItem.depth + 1 : 0;
}

function getMinDepth(nextItem?: FlattenedRow): number {
  return nextItem ? nextItem.depth : 0;
}

/**
 * Given a flattened visible-row list and a pointer-driven target depth, clamps it to what's
 * actually achievable at `targetId`'s position (bounded by its immediate neighbors) and resolves
 * the resulting parent. Ported from dnd-kit's own "Sortable Tree" reference example.
 */
export function getProjection(
  items: FlattenedRow[],
  targetId: string,
  projectedDepth: number,
): { depth: number; maxDepth: number; minDepth: number; parentId: string | null } {
  const targetIndex = items.findIndex((r) => r.id === targetId);
  const previousItem = items[targetIndex - 1];
  const nextItem = items[targetIndex + 1];
  const maxDepth = getMaxDepth(previousItem);
  const minDepth = getMinDepth(nextItem);

  let depth = projectedDepth;
  if (projectedDepth >= maxDepth) depth = maxDepth;
  else if (projectedDepth < minDepth) depth = minDepth;

  const parentId = (() => {
    if (depth === 0 || !previousItem) return null;
    if (depth === previousItem.depth) return previousItem.parentId;
    if (depth > previousItem.depth) return previousItem.id;
    return items.slice(0, targetIndex).reverse().find((r) => r.depth === depth)?.parentId ?? null;
  })();

  return { depth, maxDepth, minDepth, parentId };
}

/**
 * Reads the final `{newParentId, index}` for `activeId` off a flattened array where its depth
 * and parentId have already been patched to the projected values (see `getProjection`). `index`
 * is a post-removal splice index — the count of same-parent rows preceding `activeId` in
 * `items` — matching the convention `moveNodeToPosition` expects.
 */
export function computeDropTarget(
  items: FlattenedRow[],
  activeId: string,
): { newParentId: string | null; index: number } {
  const activeIndex = items.findIndex((r) => r.id === activeId);
  if (activeIndex === -1) return { newParentId: null, index: 0 };
  const parentId = items[activeIndex]!.parentId;
  const index = items.slice(0, activeIndex).filter((r) => r.parentId === parentId).length;
  return { newParentId: parentId, index };
}
