# Bullet Notes — Feature Documentation

Bullet Notes is a lightweight hierarchical outliner for capturing ideas in nested bullet form. This document describes every feature in the app.

---

## Table of Contents

1. [Bullet Editing](#bullet-editing)
2. [Keyboard Shortcuts](#keyboard-shortcuts)
3. [Hierarchy & Nesting](#hierarchy--nesting)
4. [Zoom (Page View)](#zoom-page-view)
5. [Inline Outline (Expand / Collapse)](#inline-outline-expand--collapse)
6. [Completing Bullets](#completing-bullets)
7. [Drag and Drop](#drag-and-drop)
8. [Search](#search)
9. [Undo & Redo](#undo--redo)
10. [Settings Panel](#settings-panel)
11. [Account & Sign-In](#account--sign-in)
12. [Cloud Storage](#cloud-storage)
13. [Sharing & Real-Time Collaboration](#sharing--real-time-collaboration)
14. [Navigation & Routes](#navigation--routes)
15. [Browser Tab Title](#browser-tab-title)
16. [Accessibility](#accessibility)

---

## Bullet Editing

Each note is a **bullet** — a single line of text with optional child bullets beneath it.

- Click into a bullet's text field to edit it.
- Text updates live as you type.
- Press **Enter** to create a new sibling bullet immediately below the current one.
- Use the **+** floating action button to add a bullet at the top of the current view (or as the first child when zoomed into an empty parent).
- Empty bullets are allowed; untitled bullets display as "Untitled" in breadcrumbs and search results.

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New sibling bullet | `Enter` |
| Indent (nest under bullet above) | `Tab` |
| Outdent (move up one level) | `Shift + Tab` |
| Toggle complete / incomplete | `Cmd + Enter` (Mac) or `Ctrl + Enter` (Windows/Linux) |
| Undo | `Cmd + Z` / `Ctrl + Z` (when focus is **not** in a text field) |
| Redo | `Cmd + Shift + Z` / `Ctrl + Shift + Z`, or `Ctrl + Y` on Windows |

Undo and redo shortcuts are intentionally disabled while typing in a bullet field so normal text editing is unaffected.

---

## Hierarchy & Nesting

Bullets form a tree structure: any bullet can have child bullets, which can have their own children, and so on.

- **Tab** indents the current bullet, making it the last child of the bullet directly above it.
- **Shift + Tab** outdents the current bullet, placing it as a sibling immediately after its former parent.
- Indenting automatically expands the new parent so nested content stays visible.
- The tree supports unlimited nesting depth.

---

## Zoom (Page View)

Zoom lets you focus on one section of your outline at a time, working only with that bullet's direct children.

- Click a bullet's **circle marker** to zoom into it.
- If the bullet has no children yet, zooming in creates an empty child bullet and focuses it so you can start writing immediately.
- The header shows **breadcrumbs** tracing your path from Home to the current zoom level.
- Click any breadcrumb (including **Home**) to jump back to that level.
- When zoomed in, the page title in the header reflects the current bullet's text.

Zoom state is saved in the cloud along with your notes and restored on reload.

---

## Inline Outline (Expand / Collapse)

Below the zoom level, bullets with children appear as an expandable inline outline.

- Bullets with children show a **disclosure triangle** to expand or collapse their sub-bullets in place.
- Parent bullets use a filled dot marker; leaf bullets use a ring marker.
- **Expand all** and **Collapse all** buttons in Settings apply to the current view's outline tree.
- When dragging to nest under a collapsed parent, the parent auto-expands after a brief hover so you can drop onto a specific child.

---

## Completing Bullets

Mark bullets as done to track progress without deleting them.

- Press **Cmd/Ctrl + Enter** while focused on a bullet to toggle its completed state.
- Completed bullets show with strikethrough styling.
- Enable **Hide completed bullets** in Settings to filter completed items out of the current view (including their subtrees at each level).
- Completed state is included in undo/redo history.

---

## Drag and Drop

Reorder and restructure bullets by dragging.

- Drag a bullet by its **circle marker**.
- Drop onto another bullet at the same level to **reorder** among siblings.
- Drag **to the right** (past a horizontal threshold) while dropping to **nest** the dragged bullet as the last child of the target.
- Drag to a bullet at a different level to move it before that bullet, including moves up to parent, grandparent, or top-level lists.
- A 6-pixel movement threshold prevents accidental drags when clicking.
- Dragging a bullet into its own descendant is blocked.

---

## Search

Open **Settings** to access the search panel. Search runs across the entire note tree, not just the current zoom level.

### Basic search

Type any text to find bullets whose content includes that text (case-insensitive).

### Excluding terms

Prefix a term with `-` to exclude matches:

```
-draft
```

### Alternatives (OR)

Use `OR` to match any of several criteria:

```
@Steve OR @Lisa
```

### Hierarchy (`>`)

Use `>` to match bullets along a path from ancestor to descendant. Each segment can have its own include/exclude terms:

```
Projects > Write draft
is:complete > review
Projects > Write draft -today
```

Segments must match in order along the root-to-node path.

### Property filters

Filter by completion status within a segment:

| Filter | Matches |
|--------|---------|
| `is:complete` | Completed bullets |
| `is:open` or `is:incomplete` | Incomplete bullets |

### Search results

- Results show the bullet text and a breadcrumb path (parent labels joined with `/`).
- Click a result to navigate to that bullet — the app zooms to the correct level and focuses the match.
- The settings panel closes automatically after navigation.

---

## Undo & Redo

Structural changes are tracked in a history stack (up to 50 snapshots).

**Actions that create undo history:**

- Toggle complete
- Create, indent, or outdent bullets
- Zoom navigation
- Drag-and-drop moves
- Navigate to a search result

**Actions that do not create undo history:**

- Typing text (text edits apply immediately without polluting the undo stack)

Undo and redo are available in the Settings panel and via global keyboard shortcuts. In shared documents, undo and redo are disabled to keep all collaborators on the same live state.

---

## Settings Panel

Open the **gear** floating action button to access settings.

### Account

- Shows your signed-in Google email address.
- **Sign out** ends your session and returns you to the sign-in screen.

### Search

Full search interface with query syntax help (see [Search](#search)).

### Appearance

Toggle between **light mode** and **dark mode**. The theme preference is saved to your cloud document.

### Bullets

- **Hide completed bullets** — filter completed items from the view.
- **Expand all** — expand every parent bullet in the current view.
- **Collapse all** — collapse every parent bullet in the current view.

### History

Undo and redo buttons with keyboard shortcut hints. Disabled in shared mode with an explanatory note.

---

## Account & Sign-In

Bullet Notes requires a **Google account** to use. Sign in is required for all routes, including personal notes, shared links, and documentation.

- On first visit, you see a **Sign in with Google** screen.
- After signing in, you are returned to the page you were trying to open (including shared links).
- Your session persists across browser restarts until you sign out.
- Sign out from **Settings → Account**.

Supabase must be configured (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`), and Google OAuth must be enabled in the Supabase dashboard.

### OAuth redirect URLs

| Setting | Value |
|---------|-------|
| Google Cloud → authorized redirect URI | `https://<project-ref>.supabase.co/auth/v1/callback` |
| Supabase → Site URL | `https://honeydew.csbod.com` |
| Supabase → Redirect URLs | `http://localhost:5173/**`, `https://honeydew.csbod.com/**` |

After sign-in, you are returned to the page you were on (including shared links like `https://honeydew.csbod.com/d/:shareToken`).

---

## Cloud Storage

Personal notes (the `/` route) are saved automatically to **Supabase PostgreSQL**, linked to your Google account.

- Saved data: bullet tree, zoom path, and settings (theme, hide completed)
- Saves are debounced (2 seconds) to avoid excessive writes while editing
- Notes sync across devices when signed in with the same account
- Undo/redo history and expand/collapse state are **not** saved

### Upgrading from local storage

If you used Bullet Notes before cloud storage, notes saved in browser localStorage (`bullet-notes:v1`) are automatically imported into your account on first sign-in, then removed from localStorage.

---

## Sharing & Real-Time Collaboration

When Supabase is configured, you can share any bullet — and everything nested under it — while the rest of your document stays private. **All participants must sign in with Google**, including collaborators opening a share link.

### Sharing a bullet

1. On desktop, hover a bullet row. A **users icon** appears to the left of the bullet marker (alongside the expand triangle when the bullet has children).
2. Click the users icon to create a secret share link for that bullet and its subtree.
3. On mobile, your phone's share sheet opens so you can copy the link or send it via Messages, email, etc. On desktop without a native share sheet, the link is copied to your clipboard.
4. After sharing, the users icon stays visible on that bullet so you can see it is shared.

Click the icon again on an already-shared bullet to re-open the share sheet with the same link.

### Shared document URL

Shared bullets live at `https://honeydew.csbod.com/d/:shareToken`, where `shareToken` is a unique UUID. Anyone with the link who is **signed in with Google** can **view and edit** that subtree in real time.

### How collaboration works

| Role | Route | What they see |
|------|-------|---------------|
| Owner | `/` | Full private document; shared subtrees sync in the background |
| Collaborator | `/d/:shareToken` | Only the shared bullet and its children |

- Edits broadcast instantly between owner and collaborators via Supabase Realtime.
- Synced actions: text changes, new bullets, indent/outdent, complete toggle, and drag-and-drop moves.
- Text broadcasts are debounced (300 ms) to reduce noise while typing.
- Shared subtrees are persisted to the database on a 2-second debounce.
- Presence tracking shows how many other people are currently editing.

### Connection status

When viewing a shared link (`/d/:shareToken`), a status line in the header shows:

- **Live** — connected, with a count of other active editors when present
- **Reconnecting** — automatic retry on connection loss
- **Connection error** — if the shared bullet cannot be loaded or saved

### Shared document limitations

- Undo and redo are disabled when viewing a shared link.
- Zoom path and personal settings are not synced between collaborators; each person manages their own view.
- Unsharing / revoking a link is not supported yet.

---

## Navigation & Routes

All routes require Google sign-in.

| Route | Mode | Description |
|-------|------|-------------|
| `/` | Personal | Your full document stored in Supabase |
| `/d/:shareToken` | Shared | A single shared bullet subtree loaded from Supabase |
| `/docs` | Help | In-app documentation (open from Settings → Help) |

The app is hosted at [honeydew.csbod.com](https://honeydew.csbod.com) and uses client-side routing (React Router). Netlify and similar hosts should redirect all paths to `index.html` for SPA support.

---

## Browser Tab Title

The document title updates dynamically:

- **Home** when at the root zoom level
- The current zoomed bullet's text (truncated to 56 characters) when zoomed in

---

## Accessibility

- Breadcrumb navigation uses a `<nav>` with an accessible label.
- Disclosure buttons expose `aria-expanded` and `aria-controls` for child regions.
- Settings panels are modal dialogs with labelled titles and close buttons.
- Per-bullet share buttons include `aria-label` attributes and stay visible when a bullet is shared.
- Theme and toggle controls use `role="switch"` with `aria-checked`.
- Search results use a listbox pattern with option buttons.
- Drag handles and action buttons include `aria-label` attributes.

---

## Tech Summary

| Area | Implementation |
|------|----------------|
| UI | React 19, TypeScript, Vite |
| Drag and drop | dnd-kit |
| Authentication | Supabase Auth (Google OAuth) |
| Personal storage | Supabase PostgreSQL (`bullet_notes_user_documents`) |
| Collaboration | Supabase (PostgreSQL + Realtime) |
| Routing | React Router |
| Styling | Custom CSS with light/dark themes |
