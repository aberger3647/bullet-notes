import { describe, it, expect, beforeEach } from 'vitest';
import { readOfflineDocumentCache, writeOfflineDocumentCache } from './offlineDocumentCache';
import type { PersistedState } from '../state/types';

const payload: PersistedState = {
  tree: [{ id: 'a', text: 'hello', completed: false, children: [] }],
  zoomPath: [],
  settings: { hideCompleted: false, theme: 'light' },
};

describe('offlineDocumentCache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when nothing has been cached', () => {
    expect(readOfflineDocumentCache()).toBeNull();
  });

  it('round-trips a written payload', () => {
    writeOfflineDocumentCache(payload);
    expect(readOfflineDocumentCache()).toEqual(payload);
  });

  it('returns null for malformed cached data', () => {
    localStorage.setItem('bullet-notes:v1:offline-cache', 'not json');
    expect(readOfflineDocumentCache()).toBeNull();
  });
});
