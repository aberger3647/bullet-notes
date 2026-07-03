import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession, mockUserDocument, makeLeaf } from './support/mockSupabase';

test.beforeEach(async ({ page }) => {
  await mockAuthenticatedSession(page);
});

test('shows a toast after sharing via the native share sheet', async ({ page }) => {
  await mockUserDocument(page, [makeLeaf('share me')]);

  // Simulate a browser/device where the Web Share API succeeds, so the app
  // takes the 'shared' branch of commitShareResult instead of the clipboard
  // fallback branch.
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, 'share', {
      value: async () => {},
      configurable: true,
    });
  });

  await page.route('**/rest/v1/rpc/bullet_notes_create_document', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify('e2e-share-token'),
    });
  });

  await page.goto('/');

  await page.getByRole('button', { name: 'Share this bullet' }).click();

  await expect(page.getByText('Link shared')).toBeVisible();
});

test('shows a toast after copying the link (clipboard fallback)', async ({ page }) => {
  await mockUserDocument(page, [makeLeaf('share me too')]);

  // Simulate a browser without the Web Share API, so the app falls back to
  // navigator.clipboard.writeText.
  await page.addInitScript(() => {
    // @ts-expect-error -- deleting a non-optional DOM property for the test
    delete window.navigator.share;
  });
  await page.context().grantPermissions(['clipboard-write']);

  await page.route('**/rest/v1/rpc/bullet_notes_create_document', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify('e2e-share-token-2'),
    });
  });

  await page.goto('/');

  await page.getByRole('button', { name: 'Share this bullet' }).click();

  await expect(page.getByText('Link copied to clipboard')).toBeVisible();
});
