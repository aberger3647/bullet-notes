import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession, mockUserDocument, makeLeaf } from './support/mockSupabase';

test.beforeEach(async ({ page }) => {
  await mockAuthenticatedSession(page);
});

test('loads the primary document and lets you add and indent bullets', async ({ page }) => {
  await mockUserDocument(page, [makeLeaf('first bullet')]);
  await page.goto('/');

  const bullets = page.getByRole('textbox', { name: 'Bullet text' });
  await expect(bullets).toHaveCount(1);
  await expect(bullets.first()).toHaveText('first bullet');

  await bullets.first().click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(bullets).toHaveCount(2);

  await page.keyboard.type('second bullet');
  await page.keyboard.press('Tab');

  // Indenting auto-expands the new parent, so its disclosure toggle now reads "Collapse".
  await expect(page.getByRole('button', { name: 'Collapse sub-bullets' })).toBeVisible();
});

test('marks a bullet complete with Cmd/Ctrl+Enter', async ({ page }) => {
  await mockUserDocument(page, [makeLeaf('finish the report')]);
  await page.goto('/');

  const bullet = page.getByRole('textbox', { name: 'Bullet text' }).first();
  await bullet.click();
  await page.keyboard.press('ControlOrMeta+Enter');

  await expect(page.locator('.bullet-row.completed')).toHaveCount(1);
});
