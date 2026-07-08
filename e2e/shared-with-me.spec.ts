import { test, expect } from '@playwright/test';
import {
  mockAuthenticatedSession,
  mockUserDocument,
  mockSharedDocument,
  mockSharedWithMe,
  makeLeaf,
} from './support/mockSupabase';

test.beforeEach(async ({ page }) => {
  await mockAuthenticatedSession(page);
});

test('shows a new-activity dot and opens the shared note from the section', async ({ page }) => {
  await mockUserDocument(page, [makeLeaf('my own bullet')]);
  await mockSharedWithMe(page, [
    {
      share_token: 'e2e-shared-token',
      revoked: false,
      updated_at: '2026-07-08T12:00:00Z',
      permission: 'edit',
      last_opened_at: '2026-07-01T12:00:00Z',
      owner_name: 'Jamie',
    },
  ]);
  await mockSharedDocument(page, 'e2e-shared-token', [makeLeaf('shared plan', 'shared-root')]);

  await page.goto('/');

  const header = page.getByRole('button', { name: 'Shared with me — 1 new' });
  await expect(header).toBeVisible();

  await header.click();
  await page.getByRole('button', { name: 'Open note shared by Jamie' }).click();

  await expect(page).toHaveURL(/\/d\/e2e-shared-token/);
  await expect(page.getByRole('textbox', { name: 'Bullet text' })).toHaveText('shared plan');
});

test('shows the section without a "new" count when nothing changed since last view', async ({ page }) => {
  await mockUserDocument(page, [makeLeaf('my own bullet')]);
  await mockSharedWithMe(page, [
    {
      share_token: 'e2e-seen-token',
      revoked: false,
      updated_at: '2026-07-01T12:00:00Z',
      permission: 'view',
      last_opened_at: '2026-07-05T12:00:00Z',
      owner_name: 'Sam',
    },
  ]);

  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Shared with me' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Shared with me — \d+ new/ })).toHaveCount(0);
});

test('clears the new-activity dot after visiting the note and navigating back', async ({ page }) => {
  await mockUserDocument(page, [makeLeaf('my own bullet')]);

  let lastOpenedAt = '2026-07-01T12:00:00Z';
  const updatedAt = '2026-07-08T12:00:00Z';
  await page.route('**/rest/v1/rpc/bullet_notes_list_shared_with_me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          share_token: 'e2e-roundtrip-token',
          revoked: false,
          updated_at: updatedAt,
          permission: 'edit',
          last_opened_at: lastOpenedAt,
          owner_name: 'Jamie',
        },
      ]),
    });
  });
  await page.route('**/rest/v1/rpc/bullet_notes_record_share_open', async (route) => {
    lastOpenedAt = updatedAt;
    await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
  });
  await mockSharedDocument(page, 'e2e-roundtrip-token', [makeLeaf('shared plan', 'roundtrip-root')]);

  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Shared with me — 1 new' })).toBeVisible();

  await page.getByRole('button', { name: 'Shared with me — 1 new' }).click();
  const recordOpen = page.waitForResponse('**/rest/v1/rpc/bullet_notes_record_share_open');
  await page.getByRole('button', { name: 'Open note shared by Jamie' }).click();
  await expect(page).toHaveURL(/\/d\/e2e-roundtrip-token/);
  await expect(page.getByRole('textbox', { name: 'Bullet text' })).toHaveText('shared plan');
  // recordShareOpen is fire-and-forget (not awaited by rendering), so wait for the mocked
  // RPC to actually resolve before navigating back, or the read below can race it.
  await recordOpen;

  // Client-side navigation back to `/`, not a hard reload — this exercises the same
  // React Router route-remount that a real "go back to my notes" action would.
  await page.goBack();

  await expect(page.getByRole('button', { name: 'Shared with me' })).toBeVisible();
  await expect(page.getByRole('button', { name: /— \d+ new/ })).toHaveCount(0);
});
