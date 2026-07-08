import { createContext, type Dispatch } from 'react';
import type { ShareResult } from '../lib/shareNode';
import type { AppAction, AppState, BulletNode } from '../state/types';
import type { SyncConnectionStatus } from '../sync/syncTypes';
import type { LastEditedBy, PresenceInfo } from '../sync/useDocumentSync';
import type { LastEditedByEntry } from '../sync/useSharedSubtreeSync';

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
  lastEditedBy: LastEditedBy | null;
  lastEditedByRoot: Map<string, LastEditedByEntry>;
  readOnly: boolean;
  shareNode: (id: string) => Promise<void>;
  shareNodeFromGesture: (id: string) => Promise<void>;
  getPendingShareToken: (id: string) => string | undefined;
  completeShareForBullet: (id: string, result: ShareResult) => void;
  editingBulletId: string | null;
  editingIndentParentId: string | undefined;
  setEditingBullet: (id: string, indentParentId?: string) => void;
  scheduleClearEditingBullet: () => void;
  keepEditingBullet: () => void;
  selectedIds: Set<string>;
  selectRange: (id: string) => void;
  clearSelection: () => void;
  bulkIndent: () => void;
  bulkOutdent: () => void;
  bulkToggleComplete: () => void;
};

export const AppStateContext = createContext<AppStateContextValue | null>(null);
