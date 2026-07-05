import { describe, it, expect } from 'vitest';
import { isSyncableAction } from './syncTypes';
import type { AppAction } from '../state/types';

describe('isSyncableAction', () => {
  const syncable: AppAction[] = [
    { type: 'SET_TEXT', id: 'x', text: 't' },
    { type: 'NEW_SIBLING_AFTER', afterId: 'x' },
    { type: 'NEW_SIBLING_BEFORE', beforeId: 'x' },
    { type: 'APPEND_CHILD', parentId: 'x' },
    { type: 'INDENT', id: 'x' },
    { type: 'OUTDENT', id: 'x' },
    { type: 'TOGGLE_COMPLETE', id: 'x' },
    { type: 'MOVE_NODE', activeId: 'a', overId: 'o', nest: false },
    { type: 'DELETE_NODE', id: 'x' },
    { type: 'MERGE_WITH_PREVIOUS', id: 'x', targetId: 'y' },
    { type: 'DUPLICATE_NODE', id: 'x' },
    { type: 'PASTE_SUBTREE', afterId: 'x', subtree: { id: 'p', text: '', completed: false, children: [] } },
    { type: 'PASTE_OUTLINE', afterId: 'x', roots: [{ id: 'p', text: '', completed: false, children: [] }] },
  ];

  it.each(syncable)('treats %o as syncable', (action) => {
    expect(isSyncableAction(action)).toBe(true);
  });

  const notSyncable: AppAction[] = [
    { type: 'SET_FOCUSED', id: null },
    { type: 'UNDO' },
    { type: 'ZOOM_INTO', id: 'x' },
  ];

  it.each(notSyncable)('treats %o as not syncable', (action) => {
    expect(isSyncableAction(action)).toBe(false);
  });
});
