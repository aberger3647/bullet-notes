import { vi } from 'vitest';

/**
 * Spy on crypto.randomUUID so internal callers (e.g. BulletRow's Enter/zoom-leaf
 * handlers) get a stable, predictable sequence. Returns the spy so callers can
 * assert/inspect. Cleaned up automatically by `restoreMocks: true` in vitest config.
 *
 * After the sequence is exhausted it keeps returning `${prefix}-${n}` so it never
 * produces duplicate ids (which would break tree invariants).
 */
export function withDeterministicUUID(prefix = 'uuid'): () => string {
  let n = 0;
  const gen = () => `${prefix}-${n++}` as `${string}-${string}-${string}-${string}-${string}`;
  vi.spyOn(crypto, 'randomUUID').mockImplementation(gen);
  return gen;
}
