import { describe, it, expect } from 'vitest';
import { shouldSnapshotToday } from './snapshotSchedule';

describe('shouldSnapshotToday', () => {
  it('is true when no snapshot has been taken yet', () => {
    expect(shouldSnapshotToday(null, new Date('2026-07-01T10:00:00Z'))).toBe(true);
  });

  it('is false when a snapshot was already taken today', () => {
    expect(shouldSnapshotToday('2026-07-01', new Date('2026-07-01T23:00:00Z'))).toBe(false);
  });

  it('is true when the last snapshot was on a previous day', () => {
    expect(shouldSnapshotToday('2026-06-30', new Date('2026-07-01T00:00:01Z'))).toBe(true);
  });
});
