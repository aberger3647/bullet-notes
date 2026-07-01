import type { BulletNode } from '../state/types';

/**
 * Build a BulletNode with an explicit id (deterministic — no crypto.randomUUID).
 * `text` defaults to the id so nodes are easy to identify in assertions.
 */
export function node(
  id: string,
  children: BulletNode[] = [],
  opts: Partial<Omit<BulletNode, 'id' | 'children'>> = {},
): BulletNode {
  return {
    id,
    text: opts.text ?? id,
    completed: opts.completed ?? false,
    children,
    ...(opts.shareToken !== undefined ? { shareToken: opts.shareToken } : {}),
  };
}

/**
 * A canonical 3-level fixture: a → b → c (each the only child of the previous).
 * Used across zoom / navigation tests.
 */
export function threeLevel(): BulletNode[] {
  return [node('a', [node('b', [node('c')])])];
}
