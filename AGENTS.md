# AGENTS.md

## Cursor Cloud specific instructions

Honeydew is a **single React 19 + Vite + TypeScript SPA** (no local backend). It talks
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
- **`npm run lint` is clean** and enforced in CI (no `continue-on-error`). If you introduce new
  `react-hooks/refs` / `react-hooks/set-state-in-effect` violations, fix them rather than suppressing —
  see `src/sync/useDocumentSync.ts` / `useUserDocumentSync.ts` for the established patterns (move
  "always-fresh ref" assignments into a bare `useEffect`, and use the "adjust state during render"
  pattern instead of `setState` at the top of a data-fetching effect).
- **Expand/collapse and undo history now persist** across reload for the local (`/`) document, via
  localStorage (`bullet-notes:v1:expanded` / `bullet-notes:v1:history`) — see `AppStateProvider.tsx`.
  This replaces the old "collapsed by default after reload" behavior.
- **Migrations**: `postinstall`/`npm run migrate` run `scripts/migrate.mjs`, which no-ops unless
  `SUPABASE_DB_URL` is set. All of `001_documents.sql` through `006_delete_my_data.sql` are applied
  to the shared instance (`bullet_notes_schema_migrations` tracks them) — multi-document support,
  version-history snapshots, view-only share permissions + share management, and delete-my-data are
  all live. This box has no `SUPABASE_DB_URL`/`DATABASE_URL` reachable from a sandboxed agent
  environment; migrations were applied by connecting directly to the Postgres container on the
  Dokploy box (`ssh alex`, `docker exec cf-supabase-dygaax-supabase-db psql -U postgres -d postgres`
  — local trust auth, no password needed inside the container). See the `dokploy-deploy` skill for
  that box's other gotchas (compose-stack networking, etc.) before touching it again.
- **E2E tests** (`npm run e2e`, Playwright) mock all Supabase network/auth/realtime traffic — see
  `e2e/support/mockSupabase.ts` — so they run without any live backend and are safe for CI. They do
  **not** verify real two-client realtime collaboration (Supabase Realtime's Phoenix-channel protocol
  isn't faithfully simulated). For that, use the phone-auth pattern above to drive two real browser
  contexts against the live instance manually/locally; that scenario is intentionally not wired into CI
  since it depends on shared live infrastructure.
- When testing GUI flows with a subagent, instruct it **not to edit source or open DevTools** — it
  should only drive the browser; the app is already functional given a valid session.
