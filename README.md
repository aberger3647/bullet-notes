# 📝 Bullet Notes

**A simple hierarchical bullet note app for fast outlining, nesting, completing, and zooming into ideas.**

Live at [honeydew.csbod.com](https://honeydew.csbod.com)

---

## 📚 Overview

**Bullet Notes** is a lightweight outliner built for quickly capturing ideas in nested bullet form.

Create bullets with **Enter**, indent notes with **Tab**, mark items complete with **Cmd/Ctrl + Enter**, and zoom into any bullet to focus only on its children. Sign in with **Google** to save your notes in the cloud and sync across devices.

---

## 👥 Who It's For

Anyone who wants a simple way to:

- Capture quick notes and ideas ✍️
- Organize thoughts into nested outlines 🌲
- Focus on one section at a time with zoomed-in views 🔍
- Mark completed bullets and hide finished work ✅
- Reorder notes by dragging bullets around 🖱️
- Duplicate, copy/paste, and merge whole branches of an outline 🌿
- Tag bullets and search by tag, text, or hierarchy 🏷️
- Keep more than one document, plus daily notes and reusable templates 📚
- Share bullets for real-time collaboration, with view-only links when you don't want editors 🔗
- Roll back to an earlier version, or export/import your notes 🕰️

---

## 💻 Tech Stack

- ⚛️ **React 19 + Vite + TypeScript** — fast, modern front end
- 🧩 **dnd-kit** — drag-and-drop reordering and nesting
- 🔐 **Supabase Auth** — Google sign-in
- 🗄️ **Supabase PostgreSQL** — cloud storage for personal and shared notes
- 📡 **Supabase Realtime** — live collaboration on shared bullets
- 🎨 **CSS** — custom light/dark theme and minimal interface

---

## 🌎 How It Works

1. Sign in with Google
2. Type into a bullet to start taking notes
3. Press **Enter** to create a new bullet at the same level
4. Press **Tab** to nest a bullet under the one above it
5. Press **Shift + Tab** to move a bullet back out
6. Press **Cmd/Ctrl + Enter** to complete or un-complete a bullet
7. Click a bullet circle to zoom into that bullet and work on its children
8. Use breadcrumbs to move back up the outline
9. Drag bullets to reorder, nest, or move them between levels
10. Share a bullet via the users icon to collaborate in real time

---

## ✨ Features

- 📝 Fast bullet entry with keyboard shortcuts, including multi-line bullets (`Shift+Enter`)
- 🌲 Nested parent and child bullets
- 🔍 Zoom into any bullet to focus on its children
- ✅ Completed bullets with strikethrough
- 🙈 Toggle to hide completed bullets
- 🖱️ Drag-and-drop reordering and nesting (plus swipe-to-delete on mobile)
- 🌿 Duplicate, merge, and copy/paste whole bullet subtrees
- 🏷️ `#tag` bullets and browse/filter by tag, alongside full-text and hierarchy search (`Cmd/Ctrl+K`)
- ↩️ Undo and redo controls, persisted across reloads
- 🌗 Light and dark mode
- ☁️ Cloud storage synced to your Google account, with offline fallback and an installable app shell
- 📤 Export to Markdown/text/JSON, import from JSON/Markdown/text outlines
- 📚 Multiple documents, daily notes, and reusable templates
- 🕰️ Automatic daily version-history snapshots with one-click restore
- 🔗 Per-bullet sharing with real-time collaboration, view-only links, and share revocation
- 👤 Profile display name, and a self-service "delete my data" option

---

## 🛠️ Local Development

### Environment

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

For automatic schema migrations on deploy, also set `SUPABASE_DB_URL` (see `.env.example`).

### Supabase setup

1. Create a Supabase project.
2. Enable **Google** under Authentication → Providers.
3. In Google Cloud Console, set the authorized redirect URI to:
   `https://<project-ref>.supabase.co/auth/v1/callback`
4. In Supabase → Authentication → URL Configuration:
   - **Site URL:** `https://honeydew.csbod.com`
   - **Redirect URLs:** `http://localhost:5173/**` and `https://honeydew.csbod.com/**`

### Run locally

```bash
npm install
npm run dev
```

To build for production:

```bash
npm run build
```

### Testing

```bash
npm test        # unit + integration tests (Vitest)
npm run e2e     # end-to-end tests (Playwright, browser-driven)
npm run lint    # ESLint
```

E2E tests mock all Supabase network/auth/realtime traffic (see `e2e/support/mockSupabase.ts`), so they run without a live backend. They don't exercise real two-client realtime collaboration — see `AGENTS.md` for how to test that manually against a live instance.

---

## 🗺️ Routes

| Route | Description |
|-------|-------------|
| `/` | Your primary notes (requires sign-in) |
| `/d/:shareToken` | A shared bullet subtree (requires sign-in) |
| `/pages` | List/create/delete your extra documents (requires sign-in) |
| `/page/:docId` | One extra document (requires sign-in) |
| `/docs` | In-app documentation |

---

## 🪄 License

This project is licensed under the **MIT License**.
