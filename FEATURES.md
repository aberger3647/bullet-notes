# Honeydew — Feature Documentation

Honeydew is a lightweight hierarchical outliner for capturing ideas in nested bullet form. This document describes every feature in the app.

---

## Table of Contents

1. [Bullet Editing](#bullet-editing)
2. [Keyboard Shortcuts](#keyboard-shortcuts)
3. [Multi-Line Bullets](#multi-line-bullets)
4. [Duplicate, Merge & Copy/Paste Subtrees](#duplicate-merge--copypaste-subtrees)
5. [Hierarchy & Nesting](#hierarchy--nesting)
6. [Zoom (Page View)](#zoom-page-view)
7. [Inline Outline (Expand / Collapse)](#inline-outline-expand--collapse)
8. [Completing Bullets](#completing-bullets)
9. [Drag and Drop](#drag-and-drop)
10. [Multi-Select](#multi-select)
11. [Mobile Swipe-to-Delete](#mobile-swipe-to-delete)
12. [Search & Tags](#search--tags)
13. [Undo & Redo](#undo--redo)
14. [Export & Import](#export--import)
15. [Version History](#version-history)
16. [Settings Panel](#settings-panel)
17. [Account & Sign-In](#account--sign-in)
18. [Cloud Storage & Offline](#cloud-storage--offline)
19. [Sharing & Real-Time Collaboration](#sharing--real-time-collaboration)
20. [Navigation & Routes](#navigation--routes)
21. [Browser Tab Title](#browser-tab-title)
22. [Accessibility](#accessibility)

---

## Bullet Editing

Each note is a **bullet** — a single line of text with optional child bullets beneath it.

- Click into a bullet's text field to edit it.
- Text updates live as you type.
- Press **Enter** to create a new sibling bullet immediately below the current one.
- Use the **+** floating action button to add a bullet at the top of the current view (or as the first child when zoomed into an empty parent).
- Empty bullets are allowed; untitled bullets display as "Untitled" in breadcrumbs and search results.
- **Arrow Up / Arrow Down** move the caret to the bullet above/below while editing, preserving the character column — including into and out of expanded children, not just siblings.
- **Backspace** at the start of a non-empty bullet merges it into the end of the previous visible bullet, re-parenting its children into the slot it occupied (rather than nesting them under the merge target).

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New sibling bullet | `Enter` |
| Line break within a bullet | `Shift + Enter` |
| Indent (nest under bullet above) | `Tab` |
| Outdent (move up one level) | `Shift + Tab` |
| Move to bullet above / below | `↑` / `↓` |
| Merge into bullet above (or delete if empty) | `Backspace` at start of bullet |
| Delete bullet + children | `Cmd/Ctrl + Backspace` (no confirmation — undo if needed) |
| Duplicate bullet + children | `Cmd/Ctrl + D` |
| Copy bullet + children | `Cmd/Ctrl + C` (with a collapsed caret, not a text selection) |
| Paste a copied bullet as a new sibling | `Cmd/Ctrl + V` |
| Toggle complete / incomplete | `Cmd + Enter` (Mac) or `Ctrl + Enter` (Windows/Linux) |
| Open search from anywhere | `Cmd/Ctrl + K` |
| Undo | `Cmd + Z` / `Ctrl + Z` — works everywhere, including while editing a bullet |
| Redo | `Cmd + Shift + Z` / `Ctrl + Shift + Z`, or `Ctrl + Y` on Windows |

---

## Multi-Line Bullets

- **Shift + Enter** inserts a literal line break within the current bullet instead of creating a new sibling.
- Pasting multi-line text (e.g. from another app) preserves the line breaks inside the bullet rather than collapsing them to spaces.
- Arrow Up/Down move within a multi-line bullet's text first, only jumping to the adjacent bullet once the caret is on the first/last line.

---

## Duplicate, Merge & Copy/Paste Subtrees

- **Cmd/Ctrl + D** duplicates the current bullet and its entire subtree as a new sibling immediately after it, with fresh ids (and no inherited share link).
- **Cmd/Ctrl + Backspace** deletes the current bullet and its children outright, immediately — no confirmation prompt; undo if it was a mistake.
- **Cmd/Ctrl + C** on a bullet (with the caret collapsed, not a text range selected) copies the bullet and everything nested under it — both as a readable tab-indented outline (for pasting into other apps) and as structured data.
- **Cmd/Ctrl + V** reconstructs a copied subtree as a new sibling bullet, instead of flattening it into one bullet's text. Pasting plain text from elsewhere still inserts as text.

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

## Multi-Select

Select a contiguous range of bullets to act on them together.

- **Shift+click** a bullet's circle marker to start a selection; **Shift+click** another marker to select every visible bullet between the two (range selection, anchored at the first click).
- Selected bullets get a light-blue row highlight, and a floating toolbar appears with **Complete**, **Outdent**, **Indent**, and a close (✕) button.
- **Complete** marks the whole selection complete if any are incomplete, or marks them all incomplete if they're already all complete — one history commit, one undo.
- **Indent** / **Outdent** move the whole selection together as a group, preserving their relative order, also as a single undoable commit.
- The selection clears automatically after a bulk action, when focusing a bullet's text to edit it, or on **Esc**.

---

## Mobile Swipe-to-Delete

On touch devices, swiping a bullet row left reveals a red delete action behind it (in addition to the delete button in the mobile editing toolbar):

- Swiping past ~72px and releasing deletes the bullet immediately, same as the keyboard shortcut — no confirmation prompt.
- A shorter swipe snaps back without deleting.
- Vertical scrolling and mouse/pointer input are unaffected — only touch-initiated horizontal drags trigger the reveal.

---

## Search & Tags

Open **Settings** to access the search panel, or press **Cmd/Ctrl + K** from anywhere in the app to open Settings with the search field already focused. Search runs across the entire note tree, not just the current zoom level.

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

### Tags

- Write `#tagname` anywhere in a bullet's text to tag it (letters, numbers, `-`, and `_`; a bare `#` or a markdown-style `# Heading` is not treated as a tag).
- Every distinct tag used anywhere in the document appears as a clickable chip above the search results, sorted alphabetically.
- Clicking a tag chip fills the search box with `#tagname`, filtering to bullets carrying that tag (reusing ordinary substring search — no separate tag index UI).

---

## Undo & Redo

Structural changes are tracked in a history stack (up to 50 snapshots).

**Actions that create undo history:**

- Toggle complete
- Create, indent, or outdent bullets
- Duplicate, delete, merge, or paste a subtree
- Zoom navigation
- Drag-and-drop moves
- Navigate to a search result

**Actions that do not create undo history:**

- Typing text (text edits apply immediately without polluting the undo stack)

Undo and redo are available in the Settings panel and via global keyboard shortcuts, and work everywhere — including while your caret is in a bullet's text field, where they replace the browser's native per-keystroke undo with the app's tree-level history. In shared documents, undo and redo are disabled to keep all collaborators on the same live state. For the primary local document, the undo/redo stack (up to 50 snapshots) and the expand/collapse state both **persist across reloads** in `localStorage`, separately from the cloud-synced document content.

---

## Export & Import

Available from **Settings → Export** / **Settings → Import**, for the primary local document.

- **Export as Markdown** — a nested GitHub-style task list (`- [ ] text`, 2-space indents).
- **Export as plain text** — a tab-indented outline, no checkboxes.
- **Export as JSON** — a full-fidelity dump of the tree (structure, completion, share tokens), suitable for re-importing.
- **Import** reads a file (`.json`, `.md`, or `.txt`) and adds its bullets into whatever you're currently zoomed into (or the top level if you're at Home) — it never replaces existing content. JSON is parsed as a full tree with fresh ids; plain text and Markdown are parsed with an indent-stack algorithm and GFM `- [x]`/`- [ ]` checkbox detection.

---

## Version History

Available from **Settings → Version history**, for the primary local document.

- A snapshot of your primary document is taken automatically, server-side, **at most once per calendar day**, the first time the app loads that day.
- Up to 30 snapshots are kept per account (older ones are pruned automatically).
- Each snapshot is listed by timestamp; **Restore** replaces your current document with that snapshot's content — you're asked to confirm first, since it's destructive to your current state.

---

## Settings Panel

Open the **gear** floating action button to access settings, or press **Cmd/Ctrl + K** to open it with search focused.

### Account

- Shows your signed-in Google email address.
- **Display name** — editable; shown to collaborators next to your presence badge in shared documents.
- **Sign out** ends your session and returns you to the sign-in screen.

### Search

Full search interface with query syntax help and tag browsing (see [Search & Tags](#search--tags)).

### Appearance

Toggle between **light mode** and **dark mode**. The theme preference is saved to your cloud document.

### Export / Import / Version history

See their dedicated sections above.

### My shared links

Lists every share you've created (local document only), with a permission toggle (**Make view-only** / **Make editable**) and **Revoke**. See [Sharing & Real-Time Collaboration](#sharing--real-time-collaboration).

### Bullets

- **Hide completed bullets** — filter completed items from the view.
- **Expand all** — expand every parent bullet in the current view.
- **Collapse all** — collapse every parent bullet in the current view.

### History

Undo and redo buttons with keyboard shortcut hints, plus the version-history list. Undo/redo is disabled in shared mode with an explanatory note (version history is local-document-only regardless of mode).

---

## Account & Sign-In

Honeydew requires a **Google account** to use. Sign in is required for all routes, including personal notes, shared links, and documentation.

- On first visit, you see a **Sign in with Google** screen.
- After signing in, you are returned to the page you were trying to open (including shared links).
- Your session persists across browser restarts until you sign out.
- Set a display name or sign out from **Settings → Account**.

Supabase must be configured (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`), and Google OAuth must be enabled in the Supabase dashboard.

### OAuth redirect URLs

| Setting | Value |
|---------|-------|
| Google Cloud → authorized redirect URI | `https://<project-ref>.supabase.co/auth/v1/callback` |
| Supabase → Site URL | `https://honeydew.csbod.com` |
| Supabase → Redirect URLs | `http://localhost:5173/**`, `https://honeydew.csbod.com/**` |

After sign-in, you are returned to the page you were on (including shared links like `https://honeydew.csbod.com/d/:shareToken`).

---

## Cloud Storage & Offline

Personal notes (the `/` route) are saved automatically to **Supabase PostgreSQL**, linked to your Google account.

- Saved data: bullet tree, zoom path, and settings (theme, hide completed)
- Saves are debounced (2 seconds) to avoid excessive writes while editing
- Notes sync across devices when signed in with the same account
- Undo/redo history and expand/collapse state are saved to `localStorage` and restored on reload (see [Undo & Redo](#undo--redo))
- A version-history snapshot of the primary document is taken automatically once per day (see [Version History](#version-history))

### Offline support

- The last successfully synced version of your primary document is cached locally. If a fetch or save fails while offline, the app falls back to that cached version and shows an **"you're offline"** banner instead of erroring out; changes resume syncing once you're back online.
- The app registers a service worker that caches the app shell (HTML/JS/CSS/icons) for repeat visits, and ships a web manifest so it can be **installed** from the browser (Add to Home Screen / install prompt). This covers *reopening the app and viewing your last-synced content* offline — it does not support offline editing with later conflict resolution.

### Upgrading from local storage

If you used this app before cloud storage, notes saved in browser localStorage (`bullet-notes:v1`) are automatically imported into your account on first sign-in, then removed from localStorage.

---

## Sharing & Real-Time Collaboration

When Supabase is configured, you can share any bullet — and everything nested under it — while the rest of your document stays private. **All participants must sign in with Google**, including collaborators opening a share link.

### Sharing a bullet

1. On desktop, hover a bullet row. A **users icon** appears to the left of the bullet marker (alongside the expand triangle when the bullet has children).
2. Click the users icon to create a secret share link for that bullet and its subtree.
3. On mobile, your phone's share sheet opens so you can copy the link or send it via Messages, email, etc. On desktop without a native share sheet, the link is copied to your clipboard.
4. After sharing, the bullet's circle marker gets a light-blue highlight so you can see at a glance which bullets are shared.

Click the users icon again on an already-shared bullet to re-open the share sheet with the same link.

### Shared document URL

Shared bullets live at `https://honeydew.csbod.com/d/:shareToken`, where `shareToken` is a unique UUID. Anyone with the link who is **signed in with Google** can view that subtree in real time; whether they can also **edit** it depends on the link's permission (see below).

### How collaboration works

| Role | Route | What they see |
|------|-------|---------------|
| Owner | `/` | Full private document; shared subtrees sync in the background |
| Collaborator | `/d/:shareToken` | Only the shared bullet and its children |

- Edits broadcast instantly between owner and collaborators via Supabase Realtime.
- Synced actions: text changes, new bullets, indent/outdent, complete toggle, drag-and-drop moves, duplicate, merge, and subtree paste.
- Text broadcasts are debounced (300 ms) to reduce noise while typing.
- Shared subtrees are persisted to the database on a 2-second debounce.
- **Presence** shows a colored badge with each other viewer's display name directly on the bullet they're currently editing, not just a count.

### View-only links & share management

Every share defaults to **editable**, matching the original behavior, but can be switched either way from **Settings → My shared links** (on the owner's local document):

- **Make view-only** / **Make editable** toggles a link's permission. View-only viewers see the content rendered as read-only (no typing, dragging, indenting, or deleting) — enforced server-side (the save RPC rejects writes to a view-only share), not just hidden in the UI.
- **Revoke** immediately cuts off a link (the RPC marks it revoked; further loads fail as if the link never existed). The underlying bullet content is not deleted — it's still part of your private document.
- The shared-note banner on a view-only link reads "Shared note (view only)".

### Connection status

When viewing a shared link (`/d/:shareToken`), a status line in the header shows:

- **Live** — connected, with other active editors' names shown as presence badges
- **Reconnecting** — automatic retry on connection loss
- **Connection error** — if the shared bullet cannot be loaded or saved

### Shared document limitations

- Undo and redo are disabled when viewing a shared link.
- Zoom path and personal settings are not synced between collaborators; each person manages their own view.
- Presence/attribution is per-bullet-being-edited, not full per-character live cursors.

---

## Navigation & Routes

All routes require Google sign-in.

| Route | Mode | Description |
|-------|------|-------------|
| `/` | Personal | Your primary document stored in Supabase |
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
| Personal storage | Supabase PostgreSQL (`bullet_notes_user_documents`, `bullet_notes_user_document_snapshots`) |
| Sharing storage | Supabase PostgreSQL (`bullet_notes_documents`, with `permission`/`revoked`/`user_id` columns) |
| Collaboration | Supabase (PostgreSQL + Realtime) |
| Routing | React Router |
| Styling | Tailwind CSS + shadcn/ui, CSS-variable-driven light/dark theming |
| Offline | Service worker (app-shell caching) + web manifest + a local fallback cache for the primary document |
| Testing | Vitest (unit/integration) + Playwright (E2E, network-mocked) |
