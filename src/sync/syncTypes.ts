import type { AppAction } from '../state/types';

export type BroadcastMessage = {
  source: string;
  action: AppAction;
  ts: number;
};

export type SyncConnectionStatus = 'idle' | 'loading' | 'connected' | 'reconnecting' | 'error';

const SYNCABLE_TYPES = new Set<AppAction['type']>([
  'SET_TEXT',
  'NEW_SIBLING_AFTER',
  'INDENT',
  'OUTDENT',
  'TOGGLE_COMPLETE',
  'MOVE_NODE',
]);

export function isSyncableAction(action: AppAction): boolean {
  return SYNCABLE_TYPES.has(action.type);
}

export const TEXT_BROADCAST_MS = 300;
export const SAVE_DEBOUNCE_MS = 2000;
