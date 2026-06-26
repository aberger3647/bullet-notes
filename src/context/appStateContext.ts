import { createContext, type Dispatch } from 'react';
import type { AppAction, AppState, BulletNode } from '../state/types';
import type { SyncConnectionStatus } from '../sync/syncTypes';

export type AppMode = 'local' | 'shared';

export type AppStateContextValue = {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  visibleChildren: BulletNode[];
  mode: AppMode;
  shareToken?: string;
  syncStatus: SyncConnectionStatus;
  otherEditors: number;
  createShareLink: () => Promise<string>;
};

export const AppStateContext = createContext<AppStateContextValue | null>(null);
