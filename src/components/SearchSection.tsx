import { useMemo, useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { searchBullets } from '../state/treeOps';

type Props = {
  onNavigate?: () => void;
};

export function SearchSection({ onNavigate }: Props) {
  const { state, dispatch } = useAppState();
  const [query, setQuery] = useState('');

  const results = useMemo(
    () => searchBullets(state.tree, query),
    [state.tree, query],
  );

  const goToResult = (id: string) => {
    dispatch({ type: 'NAVIGATE_TO_BULLET', id });
    setQuery('');
    onNavigate?.();
  };

  return (
    <>
      <label className="search-label" htmlFor="app-search">
        Find bullets
      </label>
      <input
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
      ) : null}
    </>
  );
}
