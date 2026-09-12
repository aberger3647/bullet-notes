# Honeydew

Honeydew is a React 19, Vite, and TypeScript SPA. It has no local backend and uses the shared
self-hosted Supabase through public `VITE_SUPABASE_*` values.

## Load guidance contextually

- Use `CLAUDE.md` only when an authenticated local or manual browser session is required.
- Inspect `scripts/migrate.mjs`, `scripts/apply-migrations.sh`, and
  `scripts/supabase-exec.sh` when changing or applying migrations.
- Use the existing sync modules and tests when changing realtime or document synchronization.

Do not load authentication, migration, and realtime procedures for unrelated UI or copy edits.

## Boundaries

- Every route is Google-OAuth gated. Automated browser work may use the documented disposable
  phone-auth session; do not require an interactive Google login.
- The shared Supabase is live. Do not create or alter real user data unless the task requires that
  scoped mutation.
- A pushed migration file is not deployed automatically. Shared migration application and type
  generation are explicit operator actions through the checked-in scripts.
- The Playwright suite mocks Supabase auth, database, and realtime traffic and is safe for local or
  CI use. It does not prove real two-client collaboration; use live contexts only when that
  acceptance case is explicitly requested.
- Preserve persisted expand/collapse and undo history for the local document.
- Fix new lint findings instead of suppressing them. Existing unrelated baseline failures are not
  environment failures and must not be made worse.

## Verification and completion

Local unit and mocked browser tests may be run, fixed, and rerun without asking at each step. Start
with the focused test or flow for the changed behavior, then run the relevant project scripts.
Documentation-only changes need a reviewed, well-formed diff rather than unrelated application
suites.

The task is done when the requested behavior is visible, the affected local or shared-persistence
boundary is verified, relevant checks pass, temporary auth helpers are removed, and the final diff
contains no unrelated changes.
