import { createContext, type Dispatch } from 'react';
import type { AppAction, AppState, BulletNode } from '../state/types';
import type { SyncConnectionStatus } from '../sync/syncTypes';

export type AppMode = 'local' | 'shared';

export type AppStateContextValue = {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  visibleChildren: BulletNode[];
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  ensureExpanded: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  mode: AppMode;
  shareToken?: string;
  syncStatus: SyncConnectionStatus;
  otherEditors: number;
  createShareLink: () => Promise<string>;
};

export const AppStateContext = createContext<AppStateContextValue | null>(null);
