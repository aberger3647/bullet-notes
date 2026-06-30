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
- Share bullets for real-time collaboration with others 🔗

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

- 📝 Fast bullet entry with keyboard shortcuts
- 🌲 Nested parent and child bullets
- 🔍 Zoom into any bullet to focus on its children
- ✅ Completed bullets with strikethrough
- 🙈 Toggle to hide completed bullets
- 🖱️ Drag-and-drop reordering and nesting
- ↩️ Undo and redo controls
- 🌗 Light and dark mode
- ☁️ Cloud storage synced to your Google account
- 🔗 Per-bullet sharing with real-time collaboration

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

---

## 🗺️ Routes

| Route | Description |
|-------|-------------|
| `/` | Your personal notes (requires sign-in) |
| `/d/:shareToken` | A shared bullet subtree (requires sign-in) |
| `/docs` | In-app documentation |

---

## 🪄 License

This project is licensed under the **MIT License**.
