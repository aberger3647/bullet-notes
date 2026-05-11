# 📝 Bullet Notes

**A simple hierarchical bullet note app for fast outlining, nesting, completing, and zooming into ideas.**

*(No live URL yet — local web app in development)*

---

## 📚 Overview

**Bullet Notes** is a lightweight outliner built for quickly capturing ideas in nested bullet form.

Create bullets with **Enter**, indent notes with **Tab**, mark items complete with **Cmd/Ctrl + Enter**, and zoom into any bullet to focus only on its children. Notes are saved locally in the browser, so your outline stays available after refreshing.

---

## 👥 Who It’s For

Anyone who wants a simple way to:

- Capture quick notes and ideas ✍️
- Organize thoughts into nested outlines 🌲
- Focus on one section at a time with zoomed-in views 🔍
- Mark completed bullets and hide finished work ✅
- Reorder notes by dragging bullets around 🖱️

---

## 💻 Tech Stack

- ⚛️ **React 19 + Vite + TypeScript** — fast, modern front end
- 🧩 **dnd-kit** — drag-and-drop reordering and nesting
- 💾 **localStorage** — browser-based persistence
- 🎨 **CSS** — custom light/dark theme and minimal interface

---

## 🌎 How It Works

1. Type into a bullet to start taking notes
2. Press **Enter** to create a new bullet at the same level
3. Press **Tab** to nest a bullet under the one above it
4. Press **Shift + Tab** to move a bullet back out
5. Press **Cmd/Ctrl + Enter** to complete or un-complete a bullet
6. Click a bullet circle to zoom into that bullet and work on its children
7. Use breadcrumbs to move back up the outline
8. Drag bullets to reorder, nest, or move them between levels

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
- 💾 Notes saved locally in the browser

---

## 🛠️ Local Development

```bash
npm install
npm run dev
```

To build for production:

```bash
npm run build
```

---

## 🪄 License

This project is licensed under the **MIT License**.
