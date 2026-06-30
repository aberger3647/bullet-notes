import { useMemo, useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { useVisualViewportBottom } from '../hooks/useVisualViewportBottom';
import { openShareSheet, shareUrl } from '../lib/shareNode';
import { findNodeById, locateNode } from '../state/treeOps';

function toolbarPointerAction(
  e: React.PointerEvent,
  keepEditingBullet: () => void,
  action: () => void,
) {
  e.preventDefault();
  keepEditingBullet();
  action();
}

function IndentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12H11" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m18 9 3 3-3 3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6v12" />
    </svg>
  );
}

function OutdentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9-3 3 3 3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 6v12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function MobileEditToolbar() {
  const {
    state,
    dispatch,
    editingBulletId,
    editingIndentParentId,
    ensureExpanded,
    shareNodeFromGesture,
    getPendingShareToken,
    completeShareForBullet,
    keepEditingBullet,
  } = useAppState();
  const keyboardBottom = useVisualViewportBottom();
  const [shareBusy, setShareBusy] = useState(false);

  const node = editingBulletId ? findNodeById(state.tree, editingBulletId) : null;
  const loc = editingBulletId ? locateNode(state.tree, editingBulletId) : null;

  const canIndent = loc !== null && loc.index > 0;
  const canOutdent = loc !== null && Boolean(loc.parent);
  const isCompleted = node?.completed ?? false;
  const isShared = Boolean(node?.shareToken);

  const style = useMemo(
    () => ({ bottom: keyboardBottom > 0 ? keyboardBottom : undefined }),
    [keyboardBottom],
  );

  if (!editingBulletId || !node) return null;

  const indentParentId =
    loc && loc.index > 0 ? loc.siblings[loc.index - 1]!.id : editingIndentParentId;

  const onIndent = () => {
    if (!canIndent) return;
    dispatch({ type: 'INDENT', id: editingBulletId });
    if (indentParentId) ensureExpanded(indentParentId);
  };

  const onOutdent = () => {
    if (!canOutdent) return;
    dispatch({ type: 'OUTDENT', id: editingBulletId });
  };

  const onComplete = () => {
    dispatch({ type: 'TOGGLE_COMPLETE', id: editingBulletId });
  };

  const onShare = () => {
    if (shareBusy) return;
    setShareBusy(true);
    void shareNodeFromGesture(editingBulletId)
      .catch(() => {})
      .finally(() => setShareBusy(false));
  };

  const onSharePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    keepEditingBullet();
    if (shareBusy) return;

    const token = getPendingShareToken(editingBulletId);
    if (token) {
      setShareBusy(true);
      const url = shareUrl(token);
      const title = `${(node.text.trim() || 'Shared bullet')} — Bullet Notes`;
      void openShareSheet(title, url)
        .then((result) => completeShareForBullet(editingBulletId, token, result))
        .catch(() => {})
        .finally(() => setShareBusy(false));
      return;
    }

    onShare();
  };

  return (
    <div
      className="mobile-edit-toolbar"
      role="toolbar"
      aria-label="Bullet actions"
      style={style}
    >
      <button
        type="button"
        className="mobile-edit-toolbar-btn"
        aria-label="Indent"
        disabled={!canIndent}
        onPointerDown={(e) => toolbarPointerAction(e, keepEditingBullet, onIndent)}
      >
        <IndentIcon />
        <span className="mobile-edit-toolbar-label">Indent</span>
      </button>

      <button
        type="button"
        className="mobile-edit-toolbar-btn"
        aria-label="Outdent"
        disabled={!canOutdent}
        onPointerDown={(e) => toolbarPointerAction(e, keepEditingBullet, onOutdent)}
      >
        <OutdentIcon />
        <span className="mobile-edit-toolbar-label">Outdent</span>
      </button>

      <button
        type="button"
        className={`mobile-edit-toolbar-btn ${isCompleted ? 'mobile-edit-toolbar-btn--active' : ''}`}
        aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
        aria-pressed={isCompleted}
        onPointerDown={(e) => toolbarPointerAction(e, keepEditingBullet, onComplete)}
      >
        <CheckIcon />
        <span className="mobile-edit-toolbar-label">Done</span>
      </button>

      <button
        type="button"
        className={`mobile-edit-toolbar-btn ${isShared ? 'mobile-edit-toolbar-btn--active' : ''}`}
        aria-label={isShared ? 'Shared — tap to share link' : 'Share'}
        disabled={shareBusy}
        onPointerDown={onSharePointerDown}
      >
        <UsersIcon />
        <span className="mobile-edit-toolbar-label">Share</span>
      </button>
    </div>
  );
}
