import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// --- Global module mocks for the network/sync layer ---
// The Supabase sync hooks are network-heavy and out of scope for unit/integration
// tests. Mock them so AppStateProvider runs the REAL reducer while reporting a
// healthy, configured sync status (which is what makes it render its children).
// These are only pulled in by provider/App/BulletList tests; pure-logic tests never
// import them, so the mocks are inert there.
vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: {},
}));

vi.mock('../sync/useDocumentSync', () => ({
  useDocumentSync: () => ({
    status: 'connected',
    otherEditors: 0,
    otherPresences: [],
    permission: 'edit',
    lastEditedBy: null,
    broadcastAction: () => {},
  }),
  createSharedDocument: async () => 'test-token',
}));

vi.mock('../sync/useUserDocumentSync', () => ({
  useUserDocumentSync: () => ({ status: 'connected' }),
}));

vi.mock('../sync/useSharedSubtreeSync', () => ({
  useSharedSubtreeSync: () => ({ broadcastSubtreeAction: () => {}, lastEditedByRoot: new Map() }),
}));

// React Testing Library: unmount rendered trees between tests (we use globals: false,
// so RTL's automatic cleanup isn't wired up — do it explicitly). Also reset localStorage,
// since AppStateProvider persists expand/collapse + undo history there and jsdom's
// localStorage otherwise leaks state across test files within the same worker.
afterEach(() => {
  cleanup();
  localStorage.clear();
});

// --- jsdom gaps that the app code touches ---

// window.matchMedia — used by AppStateProvider (`(hover: none)`) and theme logic.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// window.visualViewport — used by useVisualViewportBottom. jsdom does not implement it.
if (!window.visualViewport) {
  Object.defineProperty(window, 'visualViewport', {
    writable: true,
    configurable: true,
    value: {
      width: 1024,
      height: 768,
      offsetTop: 0,
      offsetLeft: 0,
      pageTop: 0,
      pageLeft: 0,
      scale: 1,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    },
  });
}

// navigator.clipboard.writeText — used by openShareSheet's copy fallback. jsdom's
// clipboard is read-only, so define it explicitly.
if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    writable: true,
    configurable: true,
    value: { writeText: async () => {}, readText: async () => '' },
  });
}

// navigator.share is intentionally left undefined by default so openShareSheet takes
// the clipboard branch. Tests that exercise the native-share branch define it per-test.
