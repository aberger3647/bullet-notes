import type { PersistedState } from '../state/types';

const OFFLINE_CACHE_KEY = 'bullet-notes:v1:offline-cache';

export function readOfflineDocumentCache(): PersistedState | null {
  try {
    const raw = localStorage.getItem(OFFLINE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed || !Array.isArray(parsed.tree)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeOfflineDocumentCache(payload: PersistedState): void {
  try {
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota/availability errors */
  }
}
