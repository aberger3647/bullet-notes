# CLAUDE.md

## Authenticating for local/manual browser testing

Every route is gated behind Google OAuth (`RequireAuth`), which cannot be completed
non-interactively. To drive the app in a browser (dev server, manual QA, agent-browser, etc.)
without a real Google login, create a session directly against the self-hosted Supabase instance:

Phone auth is enabled with `phone_autoconfirm` (no SMS/OTP needed):

```
POST {VITE_SUPABASE_URL}/auth/v1/token?grant_type=password
```
(or `/auth/v1/signup`), with header `apikey: $VITE_SUPABASE_ANON_KEY` and JSON body:
```json
{"phone": "+15555550123", "password": "..."}
```

Then log the browser in by loading the returned tokens via the URL hash (the client has
`detectSessionInUrl`):

```
http://localhost:5173/#access_token=<AT>&refresh_token=<RT>&token_type=bearer&expires_in=3600&type=magiclink
```

A convenient pattern is a temporary same-origin redirect page under `public/` that does
`location.replace("/#...")` — delete it before committing.

When testing GUI flows with a subagent, instruct it **not to edit source or open DevTools** — it
should only drive the browser; the app is already functional given a valid session.
