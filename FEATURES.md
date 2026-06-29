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
11. [Local Persistence](#local-persistence)
12. [Sharing & Real-Time Collaboration](#sharing--real-time-collaboration)
13. [Navigation & Routes](#navigation--routes)
14. [Browser Tab Title](#browser-tab-title)
15. [Accessibility](#accessibility)

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

Zoom state is saved locally along with your notes and restored on reload.

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

### Search

Full search interface with query syntax help (see [Search](#search)).

### Appearance

Toggle between **light mode** and **dark mode**. The theme preference is saved locally.

### Bullets

- **Hide completed bullets** — filter completed items from the view.
- **Expand all** — expand every parent bullet in the current view.
- **Collapse all** — collapse every parent bullet in the current view.

### History

Undo and redo buttons with keyboard shortcut hints. Disabled in shared mode with an explanatory note.

---

## Local Persistence

Personal notes (the `/` route) are saved automatically in the browser's **localStorage**.

- Storage key: `bullet-notes:v1`
- Saved data: bullet tree, zoom path, and settings (theme, hide completed)
- Saves are debounced (400 ms) to avoid excessive writes while typing
- Notes persist across page refreshes and browser restarts
- No account or sign-in is required for local use

---

## Sharing & Real-Time Collaboration

When Supabase is configured (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`), you can share notes for live collaboration.

### Creating a share link

1. Click **Share** in the header.
2. Click **Create share link**.
3. The link is copied to your clipboard and the app navigates to the shared document URL.

### Shared document URL

Shared notes live at `/d/:shareToken`, where `shareToken` is a unique UUID.

### Real-time sync

- Edits broadcast instantly to other open tabs and collaborators via Supabase Realtime.
- Synced actions: text changes, new bullets, indent/outdent, complete toggle, and drag-and-drop moves.
- Text broadcasts are debounced (300 ms) to reduce noise while typing.
- The full document tree is persisted to the database on a 2-second debounce.
- Presence tracking shows how many other people are currently editing.

### Connection status

The Share panel displays live connection status:

- **Connected** — with a count of other active editors
- **Reconnecting** — automatic retry on connection loss
- **Connection error** — if the document cannot be loaded or saved

### Shared document limitations

- Undo and redo are disabled in shared mode.
- Zoom path and personal settings are not synced; each collaborator manages their own view locally.
- Anyone with the link can view and edit the document.

---

## Navigation & Routes

| Route | Mode | Description |
|-------|------|-------------|
| `/` | Local | Personal notes stored in localStorage |
| `/d/:shareToken` | Shared | Collaborative document loaded from Supabase |

The app uses client-side routing (React Router). Netlify and similar hosts should redirect all paths to `index.html` for SPA support.

---

## Browser Tab Title

The document title updates dynamically:

- **Home** when at the root zoom level
- The current zoomed bullet's text (truncated to 56 characters) when zoomed in

---

## Accessibility

- Breadcrumb navigation uses a `<nav>` with an accessible label.
- Disclosure buttons expose `aria-expanded` and `aria-controls` for child regions.
- Settings and Share panels are modal dialogs with labelled titles and close buttons.
- Theme and toggle controls use `role="switch"` with `aria-checked`.
- Search results use a listbox pattern with option buttons.
- Drag handles and action buttons include `aria-label` attributes.

---

## Tech Summary

| Area | Implementation |
|------|----------------|
| UI | React 19, TypeScript, Vite |
| Drag and drop | dnd-kit |
| Local storage | Browser localStorage |
| Collaboration | Supabase (PostgreSQL + Realtime) |
| Routing | React Router |
| Styling | Custom CSS with light/dark themes |
