import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { Home, Settings, Plus, Users } from 'lucide-react';
import { BulletList } from './components/BulletList';
import { MobileEditToolbar } from './components/MobileEditToolbar';
import { SelectionToolbar } from './components/SelectionToolbar';
import { DocsPage } from './components/DocsPage';
import { SettingsPanel } from './components/SettingsPanel';
import { SharedWithMeSection } from './components/SharedWithMeSection';
import { RequireAuth } from './components/RequireAuth';
import { AppStateProvider } from './context/AppStateProvider';
import { useAppState } from './hooks/useAppState';
import { useGlobalUndoRedo } from './hooks/useGlobalUndoRedo';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import { useVisualViewportBottom } from './hooks/useVisualViewportBottom';
import { findNodeById, getChildrenForZoom } from './state/treeOps';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { runZoomTransition } from '@/lib/zoomTransition';
import './App.css';

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
  const {
    state,
    dispatch,
    mode,
    syncStatus,
    otherEditors,
    lastEditedBy,
    readOnly,
    editingBulletId,
    selectedIds,
    clearSelection,
    bulkIndent,
    bulkOutdent,
    bulkToggleComplete,
  } = useAppState();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchFocusToken, setSearchFocusToken] = useState(0);
  const keyboardBottom = useVisualViewportBottom();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSettingsOpen(true);
        setSearchFocusToken((t) => t + 1);
        return;
      }
      if (e.key === 'Escape' && selectedIds.size > 0) {
        clearSelection();
        return;
      }
      if (selectedIds.size === 0 || readOnly) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        bulkToggleComplete();
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) bulkOutdent();
        else bulkIndent();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedIds, clearSelection, readOnly, bulkIndent, bulkOutdent, bulkToggleComplete]);
  const shellStyle = useMemo(
    () => ({ '--keyboard-inset': `${keyboardBottom}px` }) as CSSProperties,
    [keyboardBottom],
  );

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
    <div
      className={`app-shell ${mode === 'shared' ? 'app-shell--shared' : ''} ${editingBulletId ? 'app-shell--editing' : ''}`}
      style={shellStyle}
    >
      <header className="app-header">
        {mode === 'shared' ? (
          <div
            className="mb-2.5 flex flex-col gap-1 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2"
            role="status"
            aria-label="Shared note"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                <Users className="size-3.5" aria-hidden />
                {readOnly ? 'Shared note (view only)' : 'Shared note'}
              </span>
              <span
                className={cn(
                  'text-xs',
                  syncStatus === 'connected' && 'text-foreground',
                  (syncStatus === 'error' || syncStatus === 'reconnecting') && 'text-muted-foreground',
                )}
              >
                {syncStatusLabel(syncStatus, otherEditors)}
              </span>
            </div>
            {lastEditedBy ? (
              <span className="text-xs text-muted-foreground">
                Last edited by {lastEditedBy.name} · {new Date(lastEditedBy.at).toLocaleString()}
              </span>
            ) : null}
          </div>
        ) : null}

        {mode === 'local' && syncStatus === 'offline' ? (
          <div
            className="mb-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm"
            role="status"
          >
            You're offline — showing your last synced version. Changes will sync once you're back online.
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-3">
          <nav className="mb-1.5 flex flex-wrap items-center gap-y-0.5 text-sm" aria-label="Zoom trail">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Home"
              className={cn(state.zoomPath.length === 0 && 'text-foreground font-semibold')}
              onClick={() => runZoomTransition('backward', () => dispatch({ type: 'ZOOM_TO_LEVEL', level: 0 }))}
            >
              <Home className="size-4" aria-hidden />
            </Button>
            {state.zoomPath.map((id, i) => {
              const n = findNodeById(state.tree, id);
              const label = (n?.text ?? '').trim() || 'Untitled';
              const short = label.length > 32 ? `${label.slice(0, 32)}…` : label;
              const isLast = i === state.zoomPath.length - 1;
              return (
                <span key={id} className="flex items-center">
                  <span className="mx-1 text-muted-foreground" aria-hidden>
                    /
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(isLast && 'text-foreground font-semibold', isLast && 'cursor-default')}
                    onClick={() =>
                      runZoomTransition('backward', () => dispatch({ type: 'ZOOM_TO_LEVEL', level: i + 1 }))
                    }
                  >
                    {short}
                  </Button>
                </span>
              );
            })}
          </nav>
        </div>

        {title !== null && <h1 className="zoom-title mt-1 text-2xl font-semibold text-balance">{title}</h1>}
      </header>

      <main className="app-main">
        <SharedWithMeSection />
        <BulletList />
      </main>

      <Toaster theme={state.settings.theme} position="bottom-center" offset={{ bottom: '5.5rem' }} />

      {!readOnly ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label="Add bullet"
          className="add-bullet-fab fixed bottom-4 z-40"
          onClick={addBullet}
        >
          <Plus className="size-5" aria-hidden />
        </Button>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        aria-label="Settings"
        className="settings-fab fixed bottom-4 z-40"
        onClick={() => setSettingsOpen(true)}
      >
        <Settings className="size-5" aria-hidden />
      </Button>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        searchFocusToken={searchFocusToken}
      />

      <MobileEditToolbar />
      <SelectionToolbar />
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
    <TooltipProvider>
      <Routes>
        <Route
          path="/docs"
          element={
            <RequireAuth>
              <DocsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/"
          element={
            <RequireAuth>
              <DocumentRoute mode="local" />
            </RequireAuth>
          }
        />
        <Route
          path="/d/:shareToken"
          element={
            <RequireAuth>
              <DocumentRoute mode="shared" />
            </RequireAuth>
          }
        />
      </Routes>
    </TooltipProvider>
  );
}
