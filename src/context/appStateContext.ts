import { createContext, type Dispatch } from 'react';
import type { ShareResult } from '../lib/shareNode';
import type { AppAction, AppState, BulletNode } from '../state/types';
import type { SyncConnectionStatus } from '../sync/syncTypes';
import type { PresenceInfo } from '../sync/useDocumentSync';

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
  otherPresences: PresenceInfo[];
  readOnly: boolean;
  shareNode: (id: string) => Promise<void>;
  shareNodeFromGesture: (id: string) => Promise<void>;
  getPendingShareToken: (id: string) => string | undefined;
  completeShareForBullet: (id: string, token: string, result: ShareResult) => void;
  shareMessage: string | null;
  editingBulletId: string | null;
  editingIndentParentId: string | undefined;
  setEditingBullet: (id: string, indentParentId?: string) => void;
  scheduleClearEditingBullet: () => void;
  keepEditingBullet: () => void;
};

export const AppStateContext = createContext<AppStateContextValue | null>(null);
