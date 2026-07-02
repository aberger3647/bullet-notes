import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { collectAllTags, searchBullets } from '../state/treeOps';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

type Props = {
  onNavigate?: () => void;
  /** Bump this to focus the search input (e.g. when opened via a Cmd/Ctrl+K shortcut). */
  focusToken?: number;
};

export function SearchSection({ onNavigate, focusToken }: Props) {
  const { state, dispatch } = useAppState();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusToken) inputRef.current?.focus();
  }, [focusToken]);

  const results = useMemo(
    () => searchBullets(state.tree, query),
    [state.tree, query],
  );

  const allTags = useMemo(() => collectAllTags(state.tree), [state.tree]);

  const goToResult = (id: string) => {
    dispatch({ type: 'NAVIGATE_TO_BULLET', id });
    setQuery('');
    onNavigate?.();
  };

  return (
    <>
      <Label htmlFor="app-search" className="mb-1.5">
        Find bullets
      </Label>
      <Input
        id="app-search"
        ref={inputRef}
        type="search"
        placeholder="Search notes…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
        className="mb-2"
      />
      {allTags.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Tags">
          {allTags.map((tag) => (
            <Button
              key={tag}
              type="button"
              variant="secondary"
              size="sm"
              className="h-auto rounded-full px-2.5 py-0.5"
              onClick={() => setQuery(`#${tag}`)}
            >
              #{tag}
            </Button>
          ))}
        </div>
      ) : null}
      {query.trim() ? (
        results.length > 0 ? (
          <ul className="max-h-48 overflow-y-auto rounded-lg border" role="listbox" aria-label="Search results">
            {results.map((match) => (
              <li key={match.id}>
                <button
                  type="button"
                  className="flex w-full flex-col items-start gap-0.5 border-b px-2.5 py-2 text-left last:border-b-0 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  role="option"
                  onClick={() => goToResult(match.id)}
                >
                  <span className="text-sm break-words">{match.text}</span>
                  {match.breadcrumb.length > 0 ? (
                    <span className="text-xs text-muted-foreground">{match.breadcrumb.join(' / ')}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No bullets match your search.</p>
        )
      ) : null}
    </>
  );
}
