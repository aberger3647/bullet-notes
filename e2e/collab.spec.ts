import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession, mockSharedDocument, makeLeaf, FAKE_USER_ID } from './support/mockSupabase';

test.beforeEach(async ({ page }) => {
  await mockAuthenticatedSession(page);
});

test('loads a shared document over the network and shows the shared-note banner', async ({ page }) => {
  await mockSharedDocument(page, 'e2e-share-token', [makeLeaf('shared plan', 'shared-root')]);
  await page.goto('/d/e2e-share-token');

  await expect(page.getByRole('status', { name: 'Shared note' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Bullet text' })).toHaveText('shared plan');
});

test('shows who last edited a shared document, even when they are offline now', async ({ page }) => {
  await mockSharedDocument(page, 'e2e-last-edited-token', [makeLeaf('shared plan', 'last-edited-root')], {
    lastEditedBy: 'some-other-user-id',
    lastEditedByName: 'Partner',
  });
  await page.goto('/d/e2e-last-edited-token');

  await expect(page.getByRole('status', { name: 'Shared note' })).toContainText('Last edited by Partner');
});

test('does not show a last-edited-by notice when the current user made the last edit', async ({ page }) => {
  await mockSharedDocument(page, 'e2e-self-edited-token', [makeLeaf('shared plan', 'self-edited-root')], {
    lastEditedBy: FAKE_USER_ID,
    lastEditedByName: 'E2E Tester',
  });
  await page.goto('/d/e2e-self-edited-token');

  await expect(page.getByRole('status', { name: 'Shared note' })).not.toContainText('Last edited by');
});

test('view-only shared documents render as read-only', async ({ page }) => {
  await mockSharedDocument(page, 'e2e-view-token', [makeLeaf('read only plan', 'view-root')], {
    permission: 'view',
  });
  await page.goto('/d/e2e-view-token');

  await expect(page.getByRole('status', { name: 'Shared note' })).toContainText('view only');
  const bullet = page.getByRole('textbox', { name: 'Bullet text' });
  await expect(bullet).toHaveAttribute('contenteditable', 'false');
});

test('editable (non-view-only) shared documents accept typing', async ({ page }) => {
  // Note: persisting the edit requires a live realtime connection (Supabase's
  // Phoenix-channel websocket protocol), which isn't faithfully simulated here —
  // see mockSharedDocument. This test covers the reachable, real-browser part:
  // an editable share renders as editable and accepts input, in contrast with
  // the view-only case above.
  await mockSharedDocument(page, 'e2e-edit-token', [makeLeaf('', 'edit-root')]);
  await page.goto('/d/e2e-edit-token');

  const bullet = page.getByRole('textbox', { name: 'Bullet text' });
  await expect(bullet).toHaveAttribute('contenteditable', 'true');
  await bullet.click();
  await page.keyboard.type('added via e2e');
  await expect(bullet).toHaveText('added via e2e');
});
