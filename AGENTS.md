# AGENTS.md

## Cursor Cloud specific instructions

Bullet Notes is a **single React 19 + Vite + TypeScript SPA** (no local backend). It talks
directly to a **self-hosted Supabase** (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, provided
as Cloud Agent secrets and pointing at `https://supabase.csbod.com`). Standard commands live in
`package.json` (`dev`, `build`, `lint`, `preview`, `migrate`) — use those; the dev server runs on
port `5173`.

Non-obvious caveats worth remembering:

- **Every route is gated behind Google OAuth** (`RequireAuth`). Google sign-in cannot be completed
  non-interactively, so for automated/manual E2E testing create a session directly against the
  self-hosted Supabase instead. Phone auth is enabled with `phone_autoconfirm` (no SMS/OTP needed):
  `POST {VITE_SUPABASE_URL}/auth/v1/token?grant_type=password` (or `/auth/v1/signup`) with
  `apikey: $VITE_SUPABASE_ANON_KEY` and a JSON body like `{"phone":"+15555550123","password":"..."}`.
  Then log the browser in by loading the returned tokens via the URL hash (the client has
  `detectSessionInUrl`): navigate to
  `http://localhost:5173/#access_token=<AT>&refresh_token=<RT>&token_type=bearer&expires_in=3600&type=magiclink`.
  A convenient pattern is a temporary same-origin redirect page under `public/` that
  `location.replace("/#...")` — delete it before committing.
- **`npm run lint` currently fails** on the repo's own source (pre-existing `react-hooks` errors in
  `useUserDocumentSync.ts` and others). This is a code issue, not an environment problem; the ESLint
  tooling itself works.
- **Persistence vs. collapse**: after a reload, parent bullets are **collapsed by default** (the
  `expanded` set is local UI state that resets on load), so nested children are hidden under a filled
  bullet. This is expected — it is not data loss. Verify persistence with a flat list or by expanding.
- **Migrations**: `postinstall`/`npm run migrate` run `scripts/migrate.mjs`, which no-ops unless
  `SUPABASE_DB_URL` is set. The shared Supabase already has the schema/RPCs applied
  (`bullet_notes_get_user_document`, `bullet_notes_save_user_document`, etc.), so migrations are not
  needed for local dev against it.
- When testing GUI flows with a subagent, instruct it **not to edit source or open DevTools** — it
  should only drive the browser; the app is already functional given a valid session.
