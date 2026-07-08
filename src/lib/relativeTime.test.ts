import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from './relativeTime';

describe('formatRelativeTime', () => {
  const now = new Date('2026-07-08T12:00:00Z');

  it('formats seconds', () => {
    expect(formatRelativeTime('2026-07-08T11:59:30Z', now)).toBe('30 seconds ago');
  });

  it('formats minutes', () => {
    expect(formatRelativeTime('2026-07-08T11:55:00Z', now)).toBe('5 minutes ago');
  });

  it('formats hours', () => {
    expect(formatRelativeTime('2026-07-08T09:00:00Z', now)).toBe('3 hours ago');
  });

  it('formats days', () => {
    expect(formatRelativeTime('2026-07-05T12:00:00Z', now)).toBe('3 days ago');
  });

  it('formats weeks', () => {
    expect(formatRelativeTime('2026-06-17T12:00:00Z', now)).toBe('3 weeks ago');
  });

  it('formats months', () => {
    expect(formatRelativeTime('2026-04-08T12:00:00Z', now)).toBe('3 months ago');
  });

  it('formats years', () => {
    expect(formatRelativeTime('2023-07-08T12:00:00Z', now)).toBe('3 years ago');
  });

  it('crosses the minute boundary without an off-by-one', () => {
    expect(formatRelativeTime('2026-07-08T11:59:01Z', now)).toBe('59 seconds ago');
    expect(formatRelativeTime('2026-07-08T11:59:00Z', now)).toBe('1 minute ago');
  });

  it('formats future timestamps', () => {
    expect(formatRelativeTime('2026-07-08T12:05:00Z', now)).toBe('in 5 minutes');
  });
});
