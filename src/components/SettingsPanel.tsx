import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAppState } from '../hooks/useAppState';
import { downloadFile } from '../lib/downloadFile';
import { exportToJSON, exportToMarkdown, exportToPlainText } from '../lib/exportOutline';
import { parseImportedOutline } from '../lib/importOutline';
import { useSnapshotsList } from '../sync/useSnapshotsList';
import { useMySharesList } from '../sync/useMySharesList';
import { updateProfileName, deleteMyData } from '../sync/accountApi';
import { listTemplates, saveTemplate, deleteTemplate, type Template } from '../lib/templatesStorage';
import { findNodeById } from '../state/treeOps';
import { SearchSection } from './SearchSection';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Bump this to focus the search field when the panel opens (e.g. via Cmd/Ctrl+K). */
  searchFocusToken?: number;
};

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 12H5" />
      <path d="M12 19 5 12 12 5" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  );
}

function Switch({
  checked,
  onChange,
  label,
  icon,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="switch-row"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="switch-label">
        {icon ? <span className="switch-icon">{icon}</span> : null}
        {label}
      </span>
      <span className={`switch ${checked ? 'on' : 'off'}`} aria-hidden>
        <span className="switch-thumb" />
      </span>
    </button>
  );
}

export function SettingsPanel({ open, onClose, searchFocusToken }: Props) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { state, dispatch, mode, expandAll, collapseAll } = useAppState();
  const canUndo = state.history.past.length > 0;
  const canRedo = state.history.future.length > 0;
  const isShared = mode === 'shared';

  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [deletingData, setDeletingData] = useState(false);

  const onSaveName = async () => {
    setSavingName(true);
    try {
      await updateProfileName(displayName);
    } catch {
      window.alert('Could not save your name. Try again.');
    } finally {
      setSavingName(false);
    }
  };

  const onDeleteMyData = async () => {
    const typed = window.prompt(
      'This permanently deletes all your Bullet Notes documents, snapshots, and shared links (your sign-in account itself is not affected). Type DELETE to confirm.',
    );
    if (typed !== 'DELETE') return;
    setDeletingData(true);
    try {
      await deleteMyData();
      await signOut();
    } catch {
      window.alert('Could not delete your data. Try again.');
    } finally {
      setDeletingData(false);
    }
  };

  const onExportMarkdown = () => downloadFile('bullet-notes.md', 'text/markdown', exportToMarkdown(state.tree));
  const onExportPlainText = () => downloadFile('bullet-notes.txt', 'text/plain', exportToPlainText(state.tree));
  const onExportJSON = () => downloadFile('bullet-notes.json', 'application/json', exportToJSON(state.tree));

  const importInputRef = useRef<HTMLInputElement>(null);
  const parentId = state.zoomPath.length > 0 ? state.zoomPath[state.zoomPath.length - 1]! : '__root__';

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const content = await file.text();
    const roots = parseImportedOutline(content, () => crypto.randomUUID());
    if (roots.length > 0) dispatch({ type: 'IMPORT_OUTLINE', parentId, roots });
  };

  const { snapshots, loading: snapshotsLoading, restore } = useSnapshotsList(open && !isShared);

  const onRestoreSnapshot = async (id: string) => {
    if (!window.confirm('Restore this version? Your current bullets will be replaced.')) return;
    try {
      const restored = await restore(id);
      if (!restored) return;
      dispatch({
        type: 'HYDRATE',
        payload: { tree: restored.tree, zoomPath: restored.zoom_path, settings: restored.settings },
      });
    } catch {
      window.alert('Could not restore this version. Try again.');
    }
  };

  const { shares, loading: sharesLoading, togglePermission, revoke } = useMySharesList(open && !isShared);

  const onToggleSharePermission = (shareToken: string, current: 'edit' | 'view') => {
    void togglePermission(shareToken, current === 'edit' ? 'view' : 'edit').catch(() => {
      window.alert('Could not update this share. Try again.');
    });
  };

  const onRevokeShare = (shareToken: string) => {
    if (!window.confirm('Revoke this shared link? People who have it will lose access.')) return;
    void revoke(shareToken).catch(() => {
      window.alert('Could not revoke this share. Try again.');
    });
  };

  const [templates, setTemplates] = useState<Template[]>(() => listTemplates());
  // Refresh the template list synchronously (not in an effect — it's a pure,
  // cheap localStorage read) whenever the panel transitions from closed to open.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setTemplates(listTemplates());
  }

  const onGoToTodayNote = () => {
    const today = new Date().toISOString().slice(0, 10);
    const existing = state.tree.find((n) => n.text === today);
    if (existing) {
      dispatch({ type: 'NAVIGATE_TO_BULLET', id: existing.id });
      onClose();
      return;
    }
    const newId = crypto.randomUUID();
    dispatch({ type: 'APPEND_CHILD', parentId: '__root__', newId });
    dispatch({ type: 'SET_TEXT', id: newId, text: today });
    dispatch({ type: 'ZOOM_INTO', id: newId });
    onClose();
  };

  const zoomedNode = state.zoomPath.length > 0 ? state.zoomPath[state.zoomPath.length - 1]! : null;

  const onSaveCurrentPageAsTemplate = () => {
    if (!zoomedNode) return;
    const root = findNodeById(state.tree, zoomedNode);
    if (!root) return;
    const name = window.prompt('Name this template:');
    if (!name) return;
    saveTemplate(name, root);
    setTemplates(listTemplates());
  };

  const onInsertTemplate = (template: Template) => {
    dispatch({ type: 'IMPORT_OUTLINE', parentId: '__root__', roots: [template.root] });
  };

  const onDeleteTemplate = (id: string) => {
    if (!window.confirm('Delete this template?')) return;
    deleteTemplate(id);
    setTemplates(listTemplates());
  };

  if (!open) return null;

  return (
    <div className="settings-overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="settings-header">
          <h2 id="settings-title">Settings</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </div>

        <div className="settings-section">
          <h3>Account</h3>
          {user?.email ? <p className="account-email">{user.email}</p> : null}

          <label className="search-label" htmlFor="account-display-name">
            Display name
          </label>
          <input
            id="account-display-name"
            type="text"
            className="search-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <div className="icon-row">
            <button
              type="button"
              className="icon-action"
              disabled={savingName}
              onClick={() => void onSaveName()}
            >
              Save name
            </button>
          </div>

          <div className="icon-row">
            <button
              type="button"
              className="icon-action account-sign-out"
              onClick={() => void signOut()}
            >
              Sign out
            </button>
            <button
              type="button"
              className="icon-action account-delete-data"
              disabled={deletingData}
              onClick={() => void onDeleteMyData()}
            >
              Delete my data
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3>Search</h3>
          <SearchSection onNavigate={onClose} focusToken={searchFocusToken} />
        </div>

        <div className="settings-section">
          <h3>Appearance</h3>
          <Switch
            checked={state.settings.theme === 'dark'}
            onChange={(next) => dispatch({ type: 'SET_THEME', value: next ? 'dark' : 'light' })}
            label={state.settings.theme === 'dark' ? 'Dark mode' : 'Light mode'}
            icon={state.settings.theme === 'dark' ? <MoonIcon /> : <SunIcon />}
          />
        </div>

        <div className="settings-section">
          <h3>Export</h3>
          <div className="icon-row outline-actions">
            <button type="button" className="icon-action" onClick={onExportMarkdown}>
              Export as Markdown
            </button>
            <button type="button" className="icon-action" onClick={onExportPlainText}>
              Export as plain text
            </button>
            <button type="button" className="icon-action" onClick={onExportJSON}>
              Export as JSON
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3>Import</h3>
          <p className="hint">
            Adds bullets from a JSON export or a tab-indented / markdown outline
            {state.zoomPath.length > 0 ? ' into the bullet you are zoomed into.' : ' at the top level.'}
          </p>
          <label className="icon-action" htmlFor="import-outline-input">
            Choose file to import
          </label>
          <input
            id="import-outline-input"
            ref={importInputRef}
            type="file"
            accept=".json,.md,.txt,text/plain,application/json,text/markdown"
            aria-label="Import outline file"
            className="visually-hidden"
            onChange={(e) => void onImportFile(e)}
          />
        </div>

        <div className="settings-section">
          <h3>Bullets</h3>
          <Switch
            checked={state.settings.hideCompleted}
            onChange={(next) => dispatch({ type: 'SET_HIDE_COMPLETED', value: next })}
            label="Hide completed bullets"
          />
          <div className="icon-row outline-actions">
            <button type="button" className="icon-action" onClick={expandAll}>
              Expand all
            </button>
            <button type="button" className="icon-action" onClick={collapseAll}>
              Collapse all
            </button>
          </div>
        </div>

        {!isShared ? (
          <div className="settings-section">
            <h3>Daily notes &amp; templates</h3>
            <div className="icon-row outline-actions">
              <button type="button" className="icon-action" onClick={onGoToTodayNote}>
                Go to today's note
              </button>
              <button
                type="button"
                className="icon-action"
                disabled={!zoomedNode}
                onClick={onSaveCurrentPageAsTemplate}
              >
                Save current page as template
              </button>
            </div>
            {templates.length > 0 ? (
              <ul className="search-results" role="listbox" aria-label="Templates">
                {templates.map((t) => (
                  <li key={t.id}>
                    <div className="search-result" role="option">
                      <span className="search-result-text">{t.name}</span>
                      <div className="icon-row">
                        <button type="button" className="icon-action" onClick={() => onInsertTemplate(t)}>
                          Insert
                        </button>
                        <button type="button" className="icon-action" onClick={() => onDeleteTemplate(t.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {isShared ? (
          <div className="settings-section">
            <h3>History</h3>
            <p className="hint">
              Undo and redo are disabled in shared documents so everyone stays in sync.
            </p>
          </div>
        ) : (
          <div className="settings-section">
            <h3>History</h3>
            <p className="hint">
              Shortcuts work when focus is not in a bullet field:{' '}
              <kbd>{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</kbd>+<kbd>Z</kbd> undo,{' '}
              <kbd>{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</kbd>+<kbd>⇧</kbd>+<kbd>Z</kbd>{' '}
              redo (or <kbd>Ctrl</kbd>+<kbd>Y</kbd> on Windows).
            </p>
            <div className="icon-row">
              <button
                type="button"
                className="icon-action"
                disabled={!canUndo}
                onClick={() => dispatch({ type: 'UNDO' })}
                aria-label="Undo"
                title="Undo"
              >
                <UndoIcon />
                <span className="icon-action-label">Undo</span>
              </button>
              <button
                type="button"
                className="icon-action"
                disabled={!canRedo}
                onClick={() => dispatch({ type: 'REDO' })}
                aria-label="Redo"
                title="Redo"
              >
                <RedoIcon />
                <span className="icon-action-label">Redo</span>
              </button>
            </div>

            <h3>Version history</h3>
            {snapshotsLoading ? <p className="hint">Loading…</p> : null}
            {!snapshotsLoading && snapshots.length === 0 ? (
              <p className="hint">No saved versions yet — one is taken automatically each day.</p>
            ) : null}
            <ul className="search-results" role="listbox" aria-label="Version history">
              {snapshots.map((snap) => (
                <li key={snap.id}>
                  <div className="search-result" role="option">
                    <span className="search-result-text">
                      {new Date(snap.created_at).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      className="icon-action"
                      onClick={() => void onRestoreSnapshot(snap.id)}
                    >
                      Restore
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isShared ? (
          <div className="settings-section">
            <h3>Documents</h3>
            <button
              type="button"
              className="settings-nav-link"
              onClick={() => {
                onClose();
                navigate('/pages');
              }}
            >
              <span className="settings-nav-link-label">My documents</span>
              <ChevronRightIcon />
            </button>
          </div>
        ) : null}

        {!isShared ? (
          <div className="settings-section">
            <h3>My shared links</h3>
            {sharesLoading ? <p className="hint">Loading…</p> : null}
            {!sharesLoading && shares.length === 0 ? (
              <p className="hint">You haven't shared any bullets yet.</p>
            ) : null}
            <ul className="search-results" role="listbox" aria-label="My shared links">
              {shares.map((share) => (
                <li key={share.id}>
                  <div className="search-result" role="option">
                    <span className="search-result-text">
                      {share.revoked ? 'Revoked' : share.permission === 'view' ? 'View-only' : 'Editable'}
                    </span>
                    {!share.revoked ? (
                      <div className="icon-row">
                        <button
                          type="button"
                          className="icon-action"
                          onClick={() => onToggleSharePermission(share.share_token, share.permission)}
                        >
                          {share.permission === 'edit' ? 'Make view-only' : 'Make editable'}
                        </button>
                        <button
                          type="button"
                          className="icon-action"
                          onClick={() => onRevokeShare(share.share_token)}
                        >
                          Revoke
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="settings-section">
          <h3>Help</h3>
          <button
            type="button"
            className="settings-nav-link"
            onClick={() => {
              onClose();
              navigate('/docs');
            }}
          >
            <span className="settings-nav-link-label">
              <BookIcon />
              Documentation
            </span>
            <ChevronRightIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
