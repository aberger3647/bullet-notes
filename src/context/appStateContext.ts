import { createContext, type Dispatch } from 'react';
import type { AppAction, AppState, BulletNode } from '../state/types';

export type AppStateContextValue = {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  visibleChildren: BulletNode[];
};

export const AppStateContext = createContext<AppStateContextValue | null>(null);
