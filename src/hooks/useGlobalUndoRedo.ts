import { useEffect, type Dispatch } from 'react';
import type { AppAction } from '../state/types';

/**
 * Undo/redo from anywhere, including while editing a bullet's text (the app's
 * history is tree-level, not per-keystroke, so this replaces the browser's
 * native contentEditable undo there). Real form fields (plain `<input>` /
 * `<textarea>`, e.g. Settings' search or display-name fields) still fall
 * through to native undo, since they aren't tracked in the app's history.
 */
export function useGlobalUndoRedo(dispatch: Dispatch<AppAction>, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return;
      const key = e.key.toLowerCase();
      if (e.metaKey || e.ctrlKey) {
        if (key === 'z') {
          e.preventDefault();
          if (e.shiftKey) dispatch({ type: 'REDO' });
          else dispatch({ type: 'UNDO' });
          return;
        }
      }
      if (e.ctrlKey && key === 'y' && !e.metaKey) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, enabled]);
}
