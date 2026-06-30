import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { useAppState } from '../hooks/useAppState';
import { SearchSection } from './SearchSection';

type Props = {
  open: boolean;
  onClose: () => void;
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

export function SettingsPanel({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { state, dispatch, mode, expandAll, collapseAll } = useAppState();
  const canUndo = state.history.past.length > 0;
  const canRedo = state.history.future.length > 0;
  const isShared = mode === 'shared';

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
          <button
            type="button"
            className="icon-action account-sign-out"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </div>

        <div className="settings-section">
          <h3>Search</h3>
          <SearchSection onNavigate={onClose} />
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
          </div>
        )}

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
