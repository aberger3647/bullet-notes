import type { ReactElement } from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppStateProvider } from '../context/AppStateProvider';
import { AuthContext, type AuthContextValue } from '../context/authContext';
import { useAppState } from '../hooks/useAppState';
import type { AppStateContextValue, AppMode } from '../context/appStateContext';
import type { PersistedState } from '../state/types';

const fakeAuthValue: AuthContextValue = {
  session: null,
  user: { email: 'test@example.com' } as AuthContextValue['user'],
  loading: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
};

type Options = {
  mode?: AppMode;
  shareToken?: string;
  route?: string;
  /** Seed the store with a tree after mount (dispatched via HYDRATE). */
  seed?: PersistedState;
};

/**
 * Render `ui` under the REAL AppStateProvider (sync layer mocked globally in setup).
 * Returns `getContext()` for direct access to the live context value (state/dispatch).
 */
export function renderWithProvider(ui: ReactElement, opts: Options = {}) {
  const { mode = 'local', shareToken, route = '/', seed } = opts;
  const holder: { current: AppStateContextValue | null } = { current: null };

  function Capture() {
    holder.current = useAppState();
    return null;
  }

  const utils = render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={fakeAuthValue}>
        <AppStateProvider mode={mode} shareToken={shareToken}>
          <Capture />
          {ui}
        </AppStateProvider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );

  if (seed) {
    act(() => {
      holder.current!.dispatch({ type: 'HYDRATE', payload: seed });
    });
  }

  return { ...utils, getContext: () => holder.current! };
}
