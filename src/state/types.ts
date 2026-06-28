export type BulletNode = {
  id: string;
  text: string;
  completed: boolean;
  children: BulletNode[];
};

export type Settings = {
  hideCompleted: boolean;
  theme: 'light' | 'dark';
};

export type Snapshot = {
  tree: BulletNode[];
  zoomPath: string[];
};

export type HistoryState = {
  past: Snapshot[];
  future: Snapshot[];
};

export type AppState = {
  tree: BulletNode[];
  zoomPath: string[];
  settings: Settings;
  history: HistoryState;
  focusedId: string | null;
};

export type PersistedState = {
  tree: BulletNode[];
  zoomPath: string[];
  settings: Settings;
};

export type AppAction =
  | { type: 'HYDRATE'; payload: PersistedState }
  | { type: 'NEW_SIBLING_AFTER'; afterId: string; newId?: string }
  | { type: 'NEW_SIBLING_BEFORE'; beforeId: string; newId?: string }
  | { type: 'APPEND_CHILD'; parentId: string; newId?: string }
  | { type: 'INDENT'; id: string }
  | { type: 'OUTDENT'; id: string }
  | { type: 'TOGGLE_COMPLETE'; id: string }
  | { type: 'SET_TEXT'; id: string; text: string }
  | { type: 'SET_FOCUSED'; id: string | null }
  | { type: 'ZOOM_INTO'; id: string; newChildId?: string }
  | { type: 'ZOOM_BACK' }
  | { type: 'ZOOM_TO_LEVEL'; level: number }
  | { type: 'NAVIGATE_TO_BULLET'; id: string }
  | { type: 'SET_HIDE_COMPLETED'; value: boolean }
  | { type: 'SET_THEME'; value: Settings['theme'] }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | {
      type: 'MOVE_NODE';
      activeId: string;
      overId: string;
      /** true = make active last child of over; false = reorder among siblings */
      nest: boolean;
    };

export const MAX_HISTORY = 50;
