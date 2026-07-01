# Test suite findings — triage list

The test suite was written TDD-style: each test encodes *expected/correct* behavior, not
just whatever the code currently does. This file is the backlog of anything worth your
attention that surfaced while writing it.

**Headline:** the full suite (192 tests across 15 files) is **green**. The pure logic
(`treeOps`, `reducer`, `searchQuery`) is solid — no crashing or logic bugs turned up. The
one real bug we already found by hand (zoom-into-nested-bullet) is now locked down by a
regression test. What remains below are **product/spec decisions** and **housekeeping
notes**, not failing tests. Nothing is marked `it.fails` because nothing genuinely broke.

---

## 1. Regression guarded — zoom into a nested bullet

- **Was:** zooming into an indented bullet built a broken `zoomPath`, so the body rendered
  the parent's children while the heading/breadcrumb showed the right bullet. Fixed earlier
  in `src/state/reducer.ts` (`ZOOM_INTO` now uses `getZoomPathToNode`).
- **Now guarded by:** `src/state/reducer.test.ts` →
  *"REGRESSION: zooming into a deeply nested node builds the full path and shows ITS children"*
  and *"builds the full path even when already zoomed elsewhere"*.
- **Action:** none. Keep the tests.

## 2. Spec decisions to confirm (not bugs — your call)

### 2a. Typing is not undoable
- `SET_TEXT` deliberately does **not** commit a history snapshot (so a burst of typing
  isn't 50 separate undo steps). Consequence: `Cmd+Z` will not undo the text you just typed
  into a bullet — it jumps past it to the previous structural change.
- Encoded in `reducer.test.ts` → *"updates text WITHOUT committing history"*.
- **Decide:** intended (grouped edits) or should typing be undoable (e.g. debounced commit)?
  If the latter, the test's intent flips and the reducer needs a commit strategy.

### 2b. Hiding completed bullets also hides their open children
- With "Hide completed" on, a completed **parent** disappears and takes its whole subtree
  with it — including any *incomplete* children. This matches how the real UI filters
  per-level (`AppStateProvider.getVisibleForView` + `BulletList.filterVisible`), and the pure
  helper `filterCompletedVisible` does the same.
- Encoded in `treeOps.test.ts` → *"hides an incomplete child when its parent is completed"*.
- **Decide:** intended (a done branch is done) or a surprise (you lose sight of open
  sub-tasks under a checked-off parent)?

## 3. Housekeeping notes (no action required)

- **Dead code:** `filterCompletedVisible` (`src/state/treeOps.ts:135`) is exported but never
  called anywhere except its own recursion — the app filters completed bullets inline in
  `AppStateProvider` and `BulletList` instead. Flagging, not removing (not in scope).
- **Pre-existing lint failures:** `npm run lint` reports 22 errors + 2 warnings, all in
  `src/sync/*` and `src/context/*` (ref-during-render / setState-in-effect rules). These
  predate this suite (identical on the base commit) and are unrelated to it. CI runs lint as
  a **non-blocking** step so its signal stays visible without turning CI red; clean these up
  in a separate pass if you want lint gating.
- **Sync layer is intentionally not unit-tested.** `src/sync/*` (Supabase realtime, network)
  is mocked globally in `src/test/setup.ts` and excluded from coverage. Provider/App/List
  integration tests run the *real* reducer against those mocks. End-to-end sync/collab is
  better covered by an E2E tool (out of scope here).
