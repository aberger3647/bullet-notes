import { useMemo, useState } from 'react';
import { BulletList } from './components/BulletList';
import { SettingsPanel } from './components/SettingsPanel';
import { AppStateProvider } from './context/AppStateProvider';
import { useAppState } from './hooks/useAppState';
import { useGlobalUndoRedo } from './hooks/useGlobalUndoRedo';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import { findNodeById } from './state/treeOps';
import './App.css';

function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"
      />
    </svg>
  );
}

function Shell() {
  const { state, dispatch } = useAppState();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useDocumentTitle(state.tree, state.zoomPath);
  useGlobalUndoRedo(dispatch);

  const title = useMemo(() => {
    if (state.zoomPath.length === 0) return 'Bullet notes';
    const id = state.zoomPath[state.zoomPath.length - 1]!;
    const n = findNodeById(state.tree, id);
    const t = (n?.text ?? '').trim();
    return t || 'Untitled';
  }, [state.tree, state.zoomPath]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <nav className="breadcrumbs" aria-label="Zoom trail">
          <button
            type="button"
            className={state.zoomPath.length === 0 ? 'crumb active' : 'crumb'}
            onClick={() => dispatch({ type: 'ZOOM_TO_LEVEL', level: 0 })}
          >
            All
          </button>
          {state.zoomPath.map((id, i) => {
            const n = findNodeById(state.tree, id);
            const label = (n?.text ?? '').trim() || 'Untitled';
            const short = label.length > 32 ? `${label.slice(0, 32)}…` : label;
            const isLast = i === state.zoomPath.length - 1;
            return (
              <span key={id} className="crumb-wrap">
                <span className="crumb-sep" aria-hidden>
                  /
                </span>
                <button
                  type="button"
                  className={isLast ? 'crumb active' : 'crumb'}
                  onClick={() => dispatch({ type: 'ZOOM_TO_LEVEL', level: i + 1 })}
                >
                  {short}
                </button>
              </span>
            );
          })}
        </nav>

        <h1 className="page-title">{title}</h1>
      </header>

      <main className="app-main">
        <BulletList />
      </main>

      <button
        type="button"
        className="settings-fab"
        aria-label="Settings"
        onClick={() => setSettingsOpen(true)}
      >
        <GearIcon />
      </button>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <Shell />
    </AppStateProvider>
  );
}
