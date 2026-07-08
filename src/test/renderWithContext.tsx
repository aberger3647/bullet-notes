import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AppStateContext, type AppStateContextValue } from '../context/appStateContext';
import type { AppState, BulletNode } from '../state/types';
import { TooltipProvider } from '@/components/ui/tooltip';

export function makeState(tree: BulletNode[] = [], extra: Partial<AppState> = {}): AppState {
  return {
    tree,
    zoomPath: [],
    settings: { hideCompleted: false, theme: 'light' },
    history: { past: [], future: [] },
    focusedId: null,
    focusCaret: 'all',
    ...extra,
  };
}

/** A fully-stubbed context value; override any slice per test. */
export function makeContextValue(
  overrides: Partial<AppStateContextValue> = {},
): AppStateContextValue {
  return {
    state: makeState(),
    dispatch: vi.fn(),
    visibleChildren: [],
    expanded: new Set<string>(),
    toggleExpand: vi.fn(),
    ensureExpanded: vi.fn(),
    expandAll: vi.fn(),
    collapseAll: vi.fn(),
    mode: 'local',
    shareToken: undefined,
    syncStatus: 'connected',
    otherEditors: 0,
    otherPresences: [],
    lastEditedBy: null,
    lastEditedByRoot: new Map(),
    readOnly: false,
    shareNode: vi.fn().mockResolvedValue(undefined),
    shareNodeFromGesture: vi.fn().mockResolvedValue(undefined),
    getPendingShareToken: vi.fn().mockReturnValue(undefined),
    completeShareForBullet: vi.fn(),
    editingBulletId: null,
    editingIndentParentId: undefined,
    setEditingBullet: vi.fn(),
    scheduleClearEditingBullet: vi.fn(),
    keepEditingBullet: vi.fn(),
    selectedIds: new Set<string>(),
    selectRange: vi.fn(),
    clearSelection: vi.fn(),
    bulkIndent: vi.fn(),
    bulkOutdent: vi.fn(),
    bulkToggleComplete: vi.fn(),
    ...overrides,
  };
}

/** Render `ui` under a mocked AppState context (+ router). Returns the context value. */
export function renderWithContext(ui: ReactElement, overrides: Partial<AppStateContextValue> = {}) {
  const value = makeContextValue(overrides);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter>
      <AppStateContext.Provider value={value}>
        <TooltipProvider>{children}</TooltipProvider>
      </AppStateContext.Provider>
    </MemoryRouter>
  );
  const utils = render(ui, { wrapper });
  return { ...utils, value };
}
