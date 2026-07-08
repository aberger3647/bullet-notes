import { describe, it, expect } from 'vitest';
import { isNewActivity, type SharedWithMeItem } from './sharedWithMeApi';

function item(overrides: Partial<SharedWithMeItem>): SharedWithMeItem {
  return {
    share_token: 'token',
    revoked: false,
    updated_at: '2026-07-01T00:00:00Z',
    permission: 'edit',
    last_opened_at: '2026-07-01T00:00:00Z',
    owner_name: 'Someone',
    ...overrides,
  };
}

describe('isNewActivity', () => {
  it('is true when the owner edited after the recipient last opened it', () => {
    expect(
      isNewActivity(item({ updated_at: '2026-07-02T00:00:00Z', last_opened_at: '2026-07-01T00:00:00Z' })),
    ).toBe(true);
  });

  it('is false when the recipient already saw the latest edit', () => {
    expect(
      isNewActivity(item({ updated_at: '2026-07-01T00:00:00Z', last_opened_at: '2026-07-02T00:00:00Z' })),
    ).toBe(false);
  });

  it('is false when the timestamps are equal', () => {
    expect(
      isNewActivity(item({ updated_at: '2026-07-01T00:00:00Z', last_opened_at: '2026-07-01T00:00:00Z' })),
    ).toBe(false);
  });
});
