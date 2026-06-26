import { useAppState } from '../hooks/useAppState';

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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14 4 9l5-5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 20a8 8 0 0 0-8-8H4" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m15 14 5-5-5-5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20a8 8 0 0 1 8-8h8" />
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
  const { state, dispatch, mode } = useAppState();
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
      </div>
    </div>
  );
}
