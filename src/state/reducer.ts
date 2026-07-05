import type { AppAction, AppState, FocusCaret, Snapshot } from './types';
import { MAX_HISTORY } from './types';
import {
  createNode,
  appendChild,
  findNodeById,
  indentNode,
  insertSiblingAfter,
  insertSiblingsAfter,
  insertSiblingBefore,
  locateNode,
  duplicateSubtree,
  mergeNodeIntoPrevious,
  moveAsChild,
  moveBeforeSibling,
  outdentNode,
  removeNode,
  reorderSiblings,
  sanitizeZoomPath,
  getChildrenForZoom,
  getZoomPathToNode,
  setNodeText,
  setNodeShareToken,
  clearShareTokensInSubtree,
  toggleComplete,
  setNodesCompleted,
  indentNodes,
  outdentNodes,
} from './treeOps';

const initialSettings = { hideCompleted: false, theme: 'light' as const };

export const initialAppState: AppState = {
  tree: [createNode({ text: '' })],
  zoomPath: [],
  settings: initialSettings,
  history: { past: [], future: [] },
  focusedId: null,
  focusCaret: 'all',
};

function capPast(past: Snapshot[]): Snapshot[] {
  if (past.length <= MAX_HISTORY) return past;
  return past.slice(past.length - MAX_HISTORY);
}

function snapshotOf(state: AppState): Snapshot {
  return {
    tree: structuredClone(state.tree),
    zoomPath: [...state.zoomPath],
  };
}

function withCommit(state: AppState, next: Partial<AppState>): AppState {
  const snap = snapshotOf(state);
  return {
    ...state,
    ...next,
    history: {
      past: capPast([...state.history.past, snap]),
      future: [],
    },
  };
}

function applyUndo(state: AppState): AppState {
  if (state.history.past.length === 0) return state;
  const previous = state.history.past[state.history.past.length - 1]!;
  const newPast = state.history.past.slice(0, -1);
  const currentSnap: Snapshot = snapshotOf(state);
  return {
    ...state,
    tree: previous.tree,
    zoomPath: sanitizeZoomPath(previous.tree, previous.zoomPath),
    focusedId: null,
    history: {
      past: newPast,
      future: [currentSnap, ...state.history.future],
    },
  };
}

function applyRedo(state: AppState): AppState {
  if (state.history.future.length === 0) return state;
  const next = state.history.future[0]!;
  const newFuture = state.history.future.slice(1);
  const currentSnap: Snapshot = snapshotOf(state);
  return {
    ...state,
    tree: next.tree,
    zoomPath: sanitizeZoomPath(next.tree, next.zoomPath),
    focusedId: null,
    history: {
      past: capPast([...state.history.past, currentSnap]),
      future: newFuture,
    },
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'HYDRATE': {
      const tree = action.payload.tree?.length ? action.payload.tree : initialAppState.tree;
      const zoomPath = sanitizeZoomPath(tree, action.payload.zoomPath ?? []);
      return {
        ...state,
        tree,
        zoomPath,
        settings: { ...initialSettings, ...action.payload.settings },
        history: { past: [], future: [] },
        focusedId: null,
      };
    }
    case 'SET_FOCUSED':
      return { ...state, focusedId: action.id, focusCaret: action.caret ?? 'all' };
    case 'SET_HIDE_COMPLETED':
      return { ...state, settings: { ...state.settings, hideCompleted: action.value } };
    case 'SET_THEME':
      return { ...state, settings: { ...state.settings, theme: action.value } };
    case 'UNDO':
      return applyUndo(state);
    case 'REDO':
      return applyRedo(state);
    case 'RESTORE_HISTORY':
      return { ...state, history: action.history };
    case 'SET_TEXT': {
      const nextTree = setNodeText(state.tree, action.id, action.text);
      if (nextTree === state.tree) return state;
      return { ...state, tree: nextTree };
    }
    case 'DELETE_NODE': {
      const loc = locateNode(state.tree, action.id);
      if (!loc) return state;
      // Keep at least one bullet in the document.
      if (!loc.parent && loc.siblings.length === 1) return state;
      const focusTarget =
        loc.index > 0
          ? loc.siblings[loc.index - 1]!.id
          : loc.parent?.id ?? loc.siblings[loc.index + 1]?.id ?? null;
      const focusCaret: FocusCaret = loc.index > 0 || loc.parent ? 'end' : { offset: 0 };
      const nextTree = removeNode(state.tree, action.id);
      if (nextTree === state.tree) return state;
      const zoomPath = sanitizeZoomPath(nextTree, state.zoomPath);
      return withCommit(state, { tree: nextTree, zoomPath, focusedId: focusTarget, focusCaret });
    }
    case 'MERGE_WITH_PREVIOUS': {
      if (action.id === action.targetId) return state;
      const targetLoc = locateNode(state.tree, action.targetId);
      if (!targetLoc) return state;
      if (!locateNode(state.tree, action.id)) return state;
      const caretOffset = targetLoc.node.text.length;
      const nextTree = mergeNodeIntoPrevious(state.tree, action.id, action.targetId);
      if (nextTree === state.tree) return state;
      return withCommit(state, {
        tree: nextTree,
        focusedId: action.targetId,
        focusCaret: { offset: caretOffset },
      });
    }
    case 'DUPLICATE_NODE': {
      const loc = locateNode(state.tree, action.id);
      if (!loc) return state;
      let usedFirstId = false;
      const dup = duplicateSubtree(loc.node, () => {
        if (!usedFirstId) {
          usedFirstId = true;
          return action.newId ?? crypto.randomUUID();
        }
        return crypto.randomUUID();
      });
      const nextTree = insertSiblingAfter(state.tree, action.id, dup);
      if (nextTree === state.tree) return state;
      return withCommit(state, { tree: nextTree, focusedId: dup.id, focusCaret: 'end' });
    }
    case 'PASTE_SUBTREE': {
      const loc = locateNode(state.tree, action.afterId);
      if (!loc) return state;
      let usedFirstId = false;
      const fresh = duplicateSubtree(action.subtree, () => {
        if (!usedFirstId) {
          usedFirstId = true;
          return action.newId ?? crypto.randomUUID();
        }
        return crypto.randomUUID();
      });
      const nextTree = insertSiblingAfter(state.tree, action.afterId, fresh);
      if (nextTree === state.tree) return state;
      return withCommit(state, { tree: nextTree, focusedId: fresh.id, focusCaret: 'end' });
    }
    case 'PASTE_OUTLINE': {
      if (action.roots.length === 0) return state;
      const loc = locateNode(state.tree, action.afterId);
      if (!loc) return state;
      let usedFirstId = false;
      const fresh = action.roots.map((r) =>
        duplicateSubtree(r, () => {
          if (!usedFirstId) {
            usedFirstId = true;
            return action.newId ?? crypto.randomUUID();
          }
          return crypto.randomUUID();
        }),
      );
      const nextTree = insertSiblingsAfter(state.tree, action.afterId, fresh);
      if (nextTree === state.tree) return state;
      return withCommit(state, {
        tree: nextTree,
        focusedId: fresh[fresh.length - 1]!.id,
        focusCaret: 'end',
      });
    }
    case 'IMPORT_OUTLINE': {
      if (action.roots.length === 0) return state;
      const fresh = action.roots.map((r) => duplicateSubtree(r, () => crypto.randomUUID()));
      const nextTree =
        action.parentId === '__root__'
          ? [...state.tree, ...fresh]
          : fresh.reduce((tree, root) => appendChild(tree, action.parentId, root), state.tree);
      if (nextTree === state.tree) return state;
      return withCommit(state, { tree: nextTree });
    }
    case 'SET_NODE_SHARE': {
      const nextTree = setNodeShareToken(state.tree, action.id, action.shareToken);
      if (nextTree === state.tree) return state;
      return { ...state, tree: nextTree };
    }
    case 'CLEAR_NODE_SHARES': {
      const nextTree = clearShareTokensInSubtree(state.tree, action.id);
      if (nextTree === state.tree) return state;
      return { ...state, tree: nextTree };
    }
    case 'TOGGLE_COMPLETE': {
      const nextTree = toggleComplete(state.tree, action.id);
      if (nextTree === state.tree) return state;
      return withCommit(state, { tree: nextTree });
    }
    case 'BULK_TOGGLE_COMPLETE': {
      if (action.ids.length === 0) return state;
      const anyIncomplete = action.ids.some((id) => findNodeById(state.tree, id)?.completed === false);
      const nextTree = setNodesCompleted(state.tree, action.ids, anyIncomplete);
      if (nextTree === state.tree) return state;
      return withCommit(state, { tree: nextTree });
    }
    case 'BULK_INDENT': {
      if (action.ids.length === 0) return state;
      const nextTree = indentNodes(state.tree, action.ids);
      if (nextTree === state.tree) return state;
      return withCommit(state, { tree: nextTree });
    }
    case 'BULK_OUTDENT': {
      if (action.ids.length === 0) return state;
      const nextTree = outdentNodes(state.tree, action.ids);
      if (nextTree === state.tree) return state;
      return withCommit(state, { tree: nextTree });
    }
    case 'NEW_SIBLING_AFTER': {
      const fresh = action.newId
        ? createNode({ id: action.newId, text: '' })
        : createNode({ text: '' });
      const nextTree = insertSiblingAfter(state.tree, action.afterId, fresh);
      if (nextTree === state.tree) return state;
      return withCommit(state, { tree: nextTree, focusedId: fresh.id, focusCaret: 'all' });
    }
    case 'NEW_SIBLING_BEFORE': {
      const fresh = action.newId
        ? createNode({ id: action.newId, text: '' })
        : createNode({ text: '' });
      const nextTree = insertSiblingBefore(state.tree, action.beforeId, fresh);
      if (nextTree === state.tree) return state;
      return withCommit(state, { tree: nextTree, focusedId: fresh.id, focusCaret: 'all' });
    }
    case 'APPEND_CHILD': {
      const fresh = action.newId
        ? createNode({ id: action.newId, text: '' })
        : createNode({ text: '' });
      const nextTree =
        action.parentId === '__root__'
          ? [...state.tree, fresh]
          : appendChild(state.tree, action.parentId, fresh);
      if (nextTree === state.tree) return state;
      return withCommit(state, { tree: nextTree, focusedId: fresh.id, focusCaret: 'all' });
    }
    case 'INDENT': {
      const nextTree = indentNode(state.tree, action.id);
      if (nextTree === state.tree) return state;
      return withCommit(state, { tree: nextTree, focusedId: action.id, focusCaret: 'all' });
    }
    case 'OUTDENT': {
      const nextTree = outdentNode(state.tree, action.id);
      if (nextTree === state.tree) return state;
      // Keep the user's current view in place — outdenting never re-zooms. If the
      // outdented node lands outside the zoomed subtree, it just leaves view.
      const stillVisible = getChildrenForZoom(nextTree, state.zoomPath).some((n) => n.id === action.id);
      return withCommit(state, {
        tree: nextTree,
        focusedId: stillVisible ? action.id : null,
        focusCaret: 'all',
      });
    }
    case 'ZOOM_INTO': {
      const loc = locateNode(state.tree, action.id);
      if (!loc) return state;
      const nextPath = [...getZoomPathToNode(state.tree, action.id), action.id];
      if (loc.node.children.length === 0) {
        const first = action.newChildId
          ? createNode({ id: action.newChildId, text: '' })
          : createNode({ text: '' });
        const nextTree = appendChild(state.tree, action.id, first);
        return withCommit(state, { tree: nextTree, zoomPath: nextPath, focusedId: first.id, focusCaret: 'all' });
      }
      return withCommit(state, { zoomPath: nextPath, focusedId: null });
    }
    case 'ZOOM_BACK': {
      if (state.zoomPath.length === 0) return state;
      const nextPath = state.zoomPath.slice(0, -1);
      return withCommit(state, { zoomPath: nextPath, focusedId: null });
    }
    case 'ZOOM_TO_LEVEL': {
      const level = Math.max(0, Math.floor(action.level));
      const clamped = Math.min(level, state.zoomPath.length);
      const nextPath = state.zoomPath.slice(0, clamped);
      const same =
        nextPath.length === state.zoomPath.length &&
        nextPath.every((id, i) => id === state.zoomPath[i]);
      if (same) return state;
      return withCommit(state, { zoomPath: nextPath, focusedId: null });
    }
    case 'NAVIGATE_TO_BULLET': {
      if (!findNodeById(state.tree, action.id)) return state;
      const zoomPath = getZoomPathToNode(state.tree, action.id);
      return withCommit(state, { zoomPath, focusedId: action.id, focusCaret: 'all' });
    }
    case 'MOVE_NODE': {
      const { activeId, overId, nest } = action;
      if (activeId === overId) return state;

      if (nest) {
        const nextTree = moveAsChild(state.tree, activeId, overId);
        if (nextTree === state.tree) return state;
        return withCommit(state, { tree: nextTree });
      }

      // If within the same sibling list, reorder; otherwise insert before hovered node
      // (allows dragging a child out to parent/grandparent/top-level levels).
      const reordered = reorderSiblings(state.tree, activeId, overId);
      const nextTree = reordered === state.tree ? moveBeforeSibling(state.tree, activeId, overId) : reordered;
      if (nextTree === state.tree) return state;
      return withCommit(state, { tree: nextTree });
    }
    default:
      return state;
  }
}
