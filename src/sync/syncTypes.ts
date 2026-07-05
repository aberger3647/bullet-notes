import type { AppAction } from '../state/types';

export type BroadcastMessage = {
  source: string;
  action: AppAction;
  ts: number;
};

export type SyncConnectionStatus = 'idle' | 'loading' | 'connected' | 'reconnecting' | 'offline' | 'error';

const SYNCABLE_TYPES = new Set<AppAction['type']>([
  'SET_TEXT',
  'NEW_SIBLING_AFTER',
  'NEW_SIBLING_BEFORE',
  'APPEND_CHILD',
  'INDENT',
  'OUTDENT',
  'TOGGLE_COMPLETE',
  'MOVE_NODE',
  'DELETE_NODE',
  'MERGE_WITH_PREVIOUS',
  'DUPLICATE_NODE',
  'PASTE_SUBTREE',
  'PASTE_OUTLINE',
]);

export function isSyncableAction(action: AppAction): boolean {
  return SYNCABLE_TYPES.has(action.type);
}

export const TEXT_BROADCAST_MS = 300;
export const SAVE_DEBOUNCE_MS = 2000;
export const RECONNECT_DELAY_MS = 1500;
