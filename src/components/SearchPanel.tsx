import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { searchBullets } from '../state/treeOps';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SearchPanel({ open, onClose }: Props) {
  const { state, dispatch } = useAppState();
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const results = useMemo(
    () => searchBullets(state.tree, query),
    [state.tree, query],
  );

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    searchRef.current?.focus();
  }, [open]);

  const goToResult = (id: string) => {
    dispatch({ type: 'NAVIGATE_TO_BULLET', id });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="search-overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="search-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="search-panel-header">
          <h2 id="search-title">Search</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close search">
            ✕
          </button>
        </div>

        <label className="search-label" htmlFor="app-search">
          Find bullets
        </label>
        <input
          ref={searchRef}
          id="app-search"
          type="search"
          className="search-input"
          placeholder="Search notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        {query.trim() ? (
          results.length > 0 ? (
            <ul className="search-results" role="listbox" aria-label="Search results">
              {results.map((match) => (
                <li key={match.id}>
                  <button
                    type="button"
                    className="search-result"
                    role="option"
                    onClick={() => goToResult(match.id)}
                  >
                    <span className="search-result-text">{match.text}</span>
                    {match.breadcrumb.length > 0 ? (
                      <span className="search-result-path">{match.breadcrumb.join(' / ')}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint search-empty">No bullets match your search.</p>
          )
        ) : (
          <p className="hint">
            Use <kbd>-term</kbd> to exclude (e.g. <kbd>-#high</kbd>). Use <kbd>OR</kbd> for
            alternatives (e.g. <kbd>@Steve OR @Lisa</kbd>). Use <kbd> &gt; </kbd> for hierarchy
            (e.g. <kbd>Projects &gt; Write draft -today</kbd> or{' '}
            <kbd>is:complete &gt; review</kbd>). Press <kbd>Esc</kbd> to close.
          </p>
        )}
      </div>
    </div>
  );
}
