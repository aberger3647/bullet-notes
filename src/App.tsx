import { useEffect, useMemo, useState } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { BulletList } from './components/BulletList';
import { SearchPanel } from './components/SearchPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { SharePanel } from './components/SharePanel';
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

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <line strokeLinecap="round" x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline strokeLinecap="round" strokeLinejoin="round" points="16 6 12 2 8 6" />
      <line strokeLinecap="round" strokeLinejoin="round" x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function Shell() {
  const { state, dispatch, mode } = useAppState();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useDocumentTitle(state.tree, state.zoomPath);
  useGlobalUndoRedo(dispatch, mode === 'local');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (settingsOpen || shareOpen) return;

      const target = e.target as HTMLElement;
      if (!searchOpen && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      e.preventDefault();
      setSearchOpen((open) => !open);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [settingsOpen, shareOpen, searchOpen]);

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
    <div className="app-shell">
      <header className="app-header">
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

          <button
            type="button"
            className="share-header-btn"
            aria-label="Share notes"
            onClick={() => setShareOpen(true)}
          >
            <ShareIcon />
            <span className="share-header-label">Share</span>
          </button>
        </div>

        {title !== null && <h1 className="page-title">{title}</h1>}

        <button
          type="button"
          className="search-bar"
          aria-label="Open search"
          onClick={() => setSearchOpen(true)}
        >
          <SearchIcon />
          <span>Search notes…</span>
        </button>
      </header>

      <main className="app-main">
        <BulletList />
      </main>

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

      <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <SharePanel open={shareOpen} onClose={() => setShareOpen(false)} />
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
      <Route path="/" element={<DocumentRoute mode="local" />} />
      <Route path="/d/:shareToken" element={<DocumentRoute mode="shared" />} />
    </Routes>
  );
}
