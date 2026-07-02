import { describe, it, expect } from 'vitest';
import { colorForClientId } from './presenceColor';

describe('colorForClientId', () => {
  it('returns a deterministic hsl color for the same id', () => {
    expect(colorForClientId('abc')).toBe(colorForClientId('abc'));
  });

  it('returns different colors for different ids (usually)', () => {
    expect(colorForClientId('abc')).not.toBe(colorForClientId('xyz'));
  });

  it('returns a valid hsl() css string', () => {
    expect(colorForClientId('abc')).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
  });
});
