import { test, expect } from '@playwright/test';

test('shows the Google sign-in screen when signed out', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();
});
