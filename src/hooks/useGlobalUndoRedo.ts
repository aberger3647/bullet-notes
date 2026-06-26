import { useEffect, type Dispatch } from 'react';
import type { AppAction } from '../state/types';

/** Undo/redo from anywhere; skips when typing in inputs. */
export function useGlobalUndoRedo(dispatch: Dispatch<AppAction>, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) return;
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
