import { describe, it, expect } from 'vitest';
import { getDragDepth, getProjection, computeDropTarget } from './dragProjection';
import type { FlattenedRow } from './treeOps';

describe('getDragDepth', () => {
  it('rounds to the nearest whole depth level', () => {
    expect(getDragDepth(0, 24)).toBe(0);
    expect(getDragDepth(24, 24)).toBe(1);
    expect(getDragDepth(48, 24)).toBe(2);
    expect(getDragDepth(-24, 24)).toBe(-1);
  });

  it('rounds halfway offsets up, matching Math.round', () => {
    expect(getDragDepth(12, 24)).toBe(1);
    expect(getDragDepth(36, 24)).toBe(2);
    expect(getDragDepth(-36, 24)).toBe(-1);
  });

  it('rounds small offsets below half a level down to zero', () => {
    expect(getDragDepth(11, 24)).toBe(0);
    expect(getDragDepth(13, 24)).toBe(1);
  });
});

describe('getProjection', () => {
  // a
  //   a1
  //   a2
  // b
  const siblingFixture: FlattenedRow[] = [
    { id: 'a', depth: 0, parentId: null },
    { id: 'a1', depth: 1, parentId: 'a' },
    { id: 'a2', depth: 1, parentId: 'a' },
    { id: 'b', depth: 0, parentId: null },
  ];

  it('clamps to maxDepth (previous item depth + 1) when projecting deeper', () => {
    expect(getProjection(siblingFixture, 'b', 5)).toEqual({
      depth: 2,
      maxDepth: 2,
      minDepth: 0,
      parentId: 'a2',
    });
  });

  it('clamps to minDepth (next item depth) when projecting shallower', () => {
    expect(getProjection(siblingFixture, 'a2', -3)).toEqual({
      depth: 0,
      maxDepth: 2,
      minDepth: 0,
      parentId: null,
    });
  });

  it('resolves parentId to the previous item’s own parent at the same depth', () => {
    expect(getProjection(siblingFixture, 'a2', 1)).toEqual({
      depth: 1,
      maxDepth: 2,
      minDepth: 0,
      parentId: 'a',
    });
  });

  it('resolves parentId to the previous item itself when nesting one level deeper', () => {
    expect(getProjection(siblingFixture, 'a2', 2)).toEqual({
      depth: 2,
      maxDepth: 2,
      minDepth: 0,
      parentId: 'a1',
    });
  });

  it('looks back through ancestors to resolve parentId when shallower than the previous item', () => {
    // a
    //   a1
    //     a1a
    // b
    const deepFixture: FlattenedRow[] = [
      { id: 'a', depth: 0, parentId: null },
      { id: 'a1', depth: 1, parentId: 'a' },
      { id: 'a1a', depth: 2, parentId: 'a1' },
      { id: 'b', depth: 0, parentId: null },
    ];
    expect(getProjection(deepFixture, 'b', 1)).toEqual({
      depth: 1,
      maxDepth: 3,
      minDepth: 0,
      parentId: 'a',
    });
  });

  it('forces top level when the target is the very first visible row', () => {
    const fixture: FlattenedRow[] = [
      { id: 'a', depth: 0, parentId: null },
      { id: 'b', depth: 0, parentId: null },
    ];
    expect(getProjection(fixture, 'a', 5)).toEqual({
      depth: 0,
      maxDepth: 0,
      minDepth: 0,
      parentId: null,
    });
  });

  it('floors at depth 0 when the target is the last visible row and there is no next item', () => {
    const fixture: FlattenedRow[] = [
      { id: 'a', depth: 0, parentId: null },
      { id: 'a1', depth: 1, parentId: 'a' },
    ];
    expect(getProjection(fixture, 'a1', -5)).toEqual({
      depth: 0,
      maxDepth: 1,
      minDepth: 0,
      parentId: null,
    });
  });

  it('allows nesting one level deeper than the previous item when there is no next item', () => {
    const fixture: FlattenedRow[] = [
      { id: 'a', depth: 0, parentId: null },
      { id: 'a1', depth: 1, parentId: 'a' },
    ];
    expect(getProjection(fixture, 'a1', 1)).toEqual({
      depth: 1,
      maxDepth: 1,
      minDepth: 0,
      parentId: 'a',
    });
  });
});

describe('computeDropTarget', () => {
  it('gives index 0 for a top-level row with no preceding top-level siblings', () => {
    const items: FlattenedRow[] = [
      { id: 'active', depth: 0, parentId: null },
      { id: 'b', depth: 0, parentId: null },
    ];
    expect(computeDropTarget(items, 'active')).toEqual({ newParentId: null, index: 0 });
  });

  it('counts preceding top-level siblings for the index', () => {
    const items: FlattenedRow[] = [
      { id: 'x', depth: 0, parentId: null },
      { id: 'active', depth: 0, parentId: null },
    ];
    expect(computeDropTarget(items, 'active')).toEqual({ newParentId: null, index: 1 });
  });

  it('only counts rows sharing the same parentId, skipping unrelated rows in between', () => {
    const items: FlattenedRow[] = [
      { id: 'p', depth: 0, parentId: null },
      { id: 'c1', depth: 1, parentId: 'p' },
      { id: 'other', depth: 0, parentId: null },
      { id: 'active', depth: 1, parentId: 'p' },
    ];
    expect(computeDropTarget(items, 'active')).toEqual({ newParentId: 'p', index: 1 });
  });

  it('returns a null/0 fallback when the id is not present', () => {
    const items: FlattenedRow[] = [{ id: 'a', depth: 0, parentId: null }];
    expect(computeDropTarget(items, 'missing')).toEqual({ newParentId: null, index: 0 });
  });
});
