import type { Page } from '@playwright/test';

const FAKE_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'e2e@example.com',
  app_metadata: {},
  user_metadata: { full_name: 'E2E Tester' },
  created_at: new Date().toISOString(),
};

function fakeSession() {
  return {
    access_token: 'e2e-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'e2e-refresh-token',
    user: FAKE_USER,
  };
}

// Mirrors supabase-js v2's default storage key: `sb-${hostname.split('.')[0]}-auth-token`,
// derived from this repo's VITE_SUPABASE_URL (see .env / .env.example).
const rawSupabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_STORAGE_KEY = rawSupabaseUrl
  ? `sb-${new URL(rawSupabaseUrl).hostname.split('.')[0]}-auth-token`
  : 'sb-auth-token';

/**
 * Seeds a fake Supabase session into localStorage before the app's first script
 * runs, so RequireAuth treats the browser as signed in without any real network
 * call.
 */
export async function mockAuthenticatedSession(page: Page) {
  await page.addInitScript(
    ([key, session]) => {
      window.localStorage.setItem(key as string, JSON.stringify(session));
    },
    [SUPABASE_STORAGE_KEY, fakeSession()] as const,
  );

  // Belt-and-suspenders: intercept any auth network calls the SDK still makes
  // (e.g. a background token refresh) so nothing reaches a real server and the
  // session simply appears already-valid.
  await page.route('**/auth/v1/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeSession()) });
  });
}

export function makeLeaf(text: string, id = 'e2e-root') {
  return { id, text, completed: false, children: [] };
}

/** Mocks the primary (local) document RPCs so the editor loads without a real backend. */
export async function mockUserDocument(page: Page, initialTree: unknown[] = [makeLeaf('')]) {
  let tree = initialTree;

  await page.route('**/rest/v1/rpc/bullet_notes_get_user_document', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user_id: FAKE_USER.id,
        tree,
        zoom_path: [],
        settings: { hideCompleted: false, theme: 'light' },
        updated_at: new Date().toISOString(),
      }),
    });
  });

  await page.route('**/rest/v1/rpc/bullet_notes_save_user_document', async (route) => {
    const body = route.request().postDataJSON() as { p_tree?: unknown[] };
    if (body?.p_tree) tree = body.p_tree;
    await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
  });
}

/** Mocks a shared document's RPCs (get + save) for a given share token. */
export async function mockSharedDocument(
  page: Page,
  shareToken: string,
  initialTree: unknown[],
  opts: { permission?: 'edit' | 'view' } = {},
) {
  let tree = initialTree;

  await page.route('**/rest/v1/rpc/bullet_notes_get_document', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'e2e-doc-id',
        share_token: shareToken,
        tree,
        updated_at: new Date().toISOString(),
        permission: opts.permission ?? 'edit',
        revoked: false,
      }),
    });
  });

  await page.route('**/rest/v1/rpc/bullet_notes_save_document', async (route) => {
    const body = route.request().postDataJSON() as { p_tree?: unknown[] };
    if (body?.p_tree) tree = body.p_tree;
    await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
  });

  // The realtime (collab) websocket can't be faithfully simulated without a real
  // Phoenix-channel server; abort it so the page settles into a stable
  // "reconnecting" state instead of hanging, while REST-loaded content still renders.
  await page.routeWebSocket('**/realtime/v1/**', (ws) => {
    ws.close();
  });
}
