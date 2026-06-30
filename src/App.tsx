import { useMemo, useState } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { BulletList } from './components/BulletList';
import { MobileEditToolbar } from './components/MobileEditToolbar';
import { DocsPage } from './components/DocsPage';
import { SettingsPanel } from './components/SettingsPanel';
import { AppStateProvider } from './context/AppStateProvider';
import { useAppState } from './hooks/useAppState';
import { useGlobalUndoRedo } from './hooks/useGlobalUndoRedo';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import { findNodeById, getChildrenForZoom } from './state/treeOps';
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

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <line strokeLinecap="round" x1="12" y1="5" x2="12" y2="19" />
      <line strokeLinecap="round" x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function syncStatusLabel(status: string, otherEditors: number): string {
  if (status === 'connected') {
    return otherEditors > 0
      ? `Live · ${otherEditors} other ${otherEditors === 1 ? 'person' : 'people'} editing`
      : 'Live · edits sync in real time';
  }
  if (status === 'reconnecting') return 'Reconnecting…';
  if (status === 'error') return 'Connection error';
  return 'Connecting…';
}

function Shell() {
  const { state, dispatch, mode, syncStatus, otherEditors, shareMessage, editingBulletId } = useAppState();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useDocumentTitle(state.tree, state.zoomPath);
  useGlobalUndoRedo(dispatch, mode === 'local');

  const title = useMemo(() => {
    if (state.zoomPath.length === 0) return null;
    const id = state.zoomPath[state.zoomPath.length - 1]!;
    const n = findNodeById(state.tree, id);
    const t = (n?.text ?? '').trim();
    return t || 'Untitled';
  }, [state.tree, state.zoomPath]);

  const addBullet = () => {
    const newId = crypto.randomUUID();
    const siblings = getChildrenForZoom(state.tree, state.zoomPath);

    if (siblings.length > 0) {
      const firstId = siblings[0]!.id;
      dispatch({ type: 'NEW_SIBLING_BEFORE', beforeId: firstId, newId });
      return;
    }

    if (state.zoomPath.length > 0) {
      const parentId = state.zoomPath[state.zoomPath.length - 1]!;
      dispatch({ type: 'APPEND_CHILD', parentId, newId });
      return;
    }

    dispatch({ type: 'APPEND_CHILD', parentId: '__root__', newId });
  };

  return (
    <div className={`app-shell ${mode === 'shared' ? 'app-shell--shared' : ''} ${editingBulletId ? 'app-shell--editing' : ''}`}>
      <header className="app-header">
        {mode === 'shared' ? (
          <div className="shared-note-banner" role="status" aria-label="Shared note">
            <span className="shared-note-badge">
              <UsersIcon />
              Shared note
            </span>
            <span className={`shared-note-sync sync-status sync-status--${syncStatus}`}>
              {syncStatusLabel(syncStatus, otherEditors)}
            </span>
          </div>
        ) : null}

        <div className="header-top">
          <nav className="breadcrumbs" aria-label="Zoom trail">
            <button
              type="button"
              className={state.zoomPath.length === 0 ? 'crumb active' : 'crumb'}
              onClick={() => dispatch({ type: 'ZOOM_TO_LEVEL', level: 0 })}
            >
              Home
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
        </div>

        {title !== null && <h1 className="page-title">{title}</h1>}
      </header>

      <main className="app-main">
        <BulletList />
      </main>

      {shareMessage ? (
        <div className="share-toast" role="status">
          {shareMessage}
        </div>
      ) : null}

      <button
        type="button"
        className="add-bullet-fab"
        aria-label="Add bullet"
        onClick={addBullet}
      >
        <PlusIcon />
      </button>

      <button
        type="button"
        className="settings-fab"
        aria-label="Settings"
        onClick={() => setSettingsOpen(true)}
      >
        <GearIcon />
      </button>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <MobileEditToolbar />
    </div>
  );
}

function DocumentRoute({ mode }: { mode: 'local' | 'shared' }) {
  const { shareToken } = useParams();
  return (
    <AppStateProvider mode={mode} shareToken={shareToken}>
      <Shell />
    </AppStateProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/docs" element={<DocsPage />} />
      <Route path="/" element={<DocumentRoute mode="local" />} />
      <Route path="/d/:shareToken" element={<DocumentRoute mode="shared" />} />
    </Routes>
  );
}
