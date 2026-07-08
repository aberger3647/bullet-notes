---
name: verify
description: Build/launch/drive recipe for manually verifying bullet-notes (Honeydew) changes end-to-end against a real dev server and real Supabase backend, using two authenticated browser contexts.
---

# Verifying bullet-notes changes

This is a Vite + React SPA (`src/`) backed by self-hosted Supabase. Most changes are GUI —
verify by driving a real browser against the real dev server and real backend, not just
`npm test`.

## Launch

```bash
npm run dev -- --port 5173 --strictPort &
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/   # expect 200 once up
```

Requires `.env` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` already set (check with
`grep VITE_SUPABASE .env` — don't print the values).

## Auth (no real Google login needed)

Per the root `CLAUDE.md`: phone auth is enabled with `phone_autoconfirm`. Sign up/sign in a
throwaway phone number directly against Supabase, then inject the returned tokens into the
browser via the URL hash (the client has `detectSessionInUrl`):

```bash
curl -s -X POST "${VITE_SUPABASE_URL}/auth/v1/signup" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" -H "Content-Type: application/json" \
  -d '{"phone":"+15550001001","password":"some-password-123"}'
# phone must be valid E.164 (digits only after the +, no letters) or signup 400s.
# If the number already exists, use grant_type=password against /auth/v1/token instead.
```

Take `access_token`/`refresh_token` from the response, then in Playwright:

```js
await page.goto(
  `http://localhost:5173/#access_token=${AT}&refresh_token=${RT}&token_type=bearer&expires_in=3600&type=magiclink`,
);
await page.getByRole('button', { name: 'Add bullet' }).waitFor(); // app shell loaded
```

For two-actor flows (sharing, collaboration), create two separate phone numbers and drive them
in two separate `browser.newContext()`s in the same script — do not reuse one context for both,
sessions don't isolate otherwise.

## Running a Playwright script directly (not via the `e2e/` test runner)

For one-off/manual verification scripts (as opposed to committed specs under `e2e/`), write the
`.mjs` file **inside the project tree** (e.g. a dotfile at the repo root), not under `/tmp` —
Node's ESM resolver walks up from the importing file's own location to find `node_modules`, so a
script under `/tmp` can't resolve `@playwright/test`. Delete the scratch file when done; it's not
part of the committed test suite.

```bash
node ./.tmp-verify-something.mjs
```

## Gotchas seen in practice

- **`recordShareOpen` (and similar "fire and forget" calls) are not awaited by rendering** —
  `void someCall().catch(() => {})` patterns exist in the sync hooks. If your script's next step
  depends on that side effect having landed server-side (e.g. checking that opening a share
  updates `last_opened_at`), explicitly `await page.waitForResponse('**/rest/v1/rpc/<name>')`
  before proceeding — don't assume it's done just because the UI it triggered from has settled.
- **Debounced autosave**: typing into a bullet doesn't save instantly. If a script types then
  immediately navigates away (`page.goto`/hard reload) or triggers another action that depends on
  the primary document's save having flushed, add a ~1.5-2s wait first, or the edit can be lost on
  reload (the in-memory debounce timer never fires because the page tore down). Actions that
  extract/copy state independent of the primary doc's save cycle (e.g. creating a share, which
  snapshots the subtree client-side into its own document row) are NOT affected by this — only
  reads of the *primary* document after a hard navigation are.
- **Real accounts persist real data across script runs** — this hits a real Supabase backend, not
  a mock. Re-running a verification script against the same phone-auth account accumulates bullets
  and shares from previous runs. Locators like `getByRole('button', { name: /^Open note/ }).first()`
  that were unambiguous on a fresh account can become "resolved to N elements" strict-mode
  violations later. Prefer unique, script-generated text per run (e.g. include a timestamp/random
  suffix) when a locator needs to stay unambiguous across repeated runs, or revoke/clean up
  test shares at the end of a script.
- **Playwright's `getByRole('textbox', ...).waitFor()` can resolve on a transient element** during
  a route transition (client-side `navigate()` unmounting one document's tree and mounting
  another's). A single ad hoc read immediately after a click occasionally caught an empty/stale
  textbox once during verification, but two follow-up runs with checkpointed reads at
  0/100/250/500/1000/2000/4000ms after the click showed the real content appearing by ~250-550ms
  and staying stable through 4s, both via a direct `page.goto` and via clicking through the app's
  own "Open" affordance — never reproduced a second time. If you see this, don't trust a single
  immediate read; poll a few checkpoints before concluding it's a real bug.
