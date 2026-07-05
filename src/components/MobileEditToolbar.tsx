import { useState } from 'react';
import { IndentIncrease, IndentDecrease, Check, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAppState } from '../hooks/useAppState';
import { openShareSheet, shareUrl } from '../lib/shareNode';
import { findNodeById, locateNode } from '../state/treeOps';
import { revokeSharesInSubtree } from '../sync/sharesApi';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function toolbarPointerAction(
  e: React.PointerEvent,
  keepEditingBullet: () => void,
  action: () => void,
) {
  e.preventDefault();
  keepEditingBullet();
  action();
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
  const [shareBusy, setShareBusy] = useState(false);

  const node = editingBulletId ? findNodeById(state.tree, editingBulletId) : null;
  const loc = editingBulletId ? locateNode(state.tree, editingBulletId) : null;

  const canIndent = loc !== null && loc.index > 0;
  const canOutdent = loc !== null && Boolean(loc.parent);
  const isCompleted = node?.completed ?? false;
  const isShared = Boolean(node?.shareToken);

  if (!editingBulletId || !node) return null;

  const indentParentId =
    loc && loc.index > 0 ? loc.siblings[loc.index - 1]!.id : editingIndentParentId;

  const onIndent = () => {
    if (!canIndent) return;
    dispatch({ type: 'INDENT', id: editingBulletId });
    if (indentParentId) ensureExpanded(indentParentId);
  };

  const onOutdent = () => {
    if (!canOutdent || !loc?.parent) return;
    const parentLoc = locateNode(state.tree, loc.parent.id);
    if (parentLoc?.parent) ensureExpanded(parentLoc.parent.id);
    dispatch({ type: 'OUTDENT', id: editingBulletId });
  };

  const onComplete = () => {
    dispatch({ type: 'TOGGLE_COMPLETE', id: editingBulletId });
  };

  const onDelete = () => {
    if (loc && !loc.parent && loc.siblings.length === 1) {
      toast('Add another bullet before deleting this one', { duration: 2000 });
      return;
    }
    revokeSharesInSubtree(state.tree, editingBulletId);
    dispatch({ type: 'CLEAR_NODE_SHARES', id: editingBulletId });
    dispatch({ type: 'DELETE_NODE', id: editingBulletId });
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
      const title = `${(node.text.trim() || 'Shared bullet')} — Honeydew`;
      void openShareSheet(title, url)
        .then((result) => completeShareForBullet(editingBulletId, result))
        .catch(() => {})
        .finally(() => setShareBusy(false));
      return;
    }

    onShare();
  };

  return (
    <div
      className="mobile-edit-toolbar shadow-[0_-4px_16px_oklch(0_0_0/8%)]"
      role="toolbar"
      aria-label="Bullet actions"
    >
      <Button
        type="button"
        variant="ghost"
        className="h-11 flex-1 touch-manipulation select-none"
        aria-label="Indent"
        disabled={!canIndent}
        onPointerDown={(e) => toolbarPointerAction(e, keepEditingBullet, onIndent)}
      >
        <IndentIncrease className="size-5.5" aria-hidden />
      </Button>

      <Button
        type="button"
        variant="ghost"
        className="h-11 flex-1 touch-manipulation select-none"
        aria-label="Outdent"
        disabled={!canOutdent}
        onPointerDown={(e) => toolbarPointerAction(e, keepEditingBullet, onOutdent)}
      >
        <IndentDecrease className="size-5.5" aria-hidden />
      </Button>

      <Button
        type="button"
        variant="ghost"
        className={cn(
          'h-11 flex-1 touch-manipulation select-none',
          isCompleted && 'text-primary',
        )}
        aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
        aria-pressed={isCompleted}
        onPointerDown={(e) => toolbarPointerAction(e, keepEditingBullet, onComplete)}
      >
        <Check className="size-5.5" aria-hidden />
      </Button>

      <Button
        type="button"
        variant="ghost"
        className={cn(
          'h-11 flex-1 touch-manipulation select-none',
          isShared && 'text-primary',
        )}
        aria-label={isShared ? 'Shared — tap to share link' : 'Share'}
        disabled={shareBusy}
        onPointerDown={onSharePointerDown}
      >
        <Users className="size-5.5" aria-hidden />
      </Button>

      <Button
        type="button"
        variant="ghost"
        className="h-11 flex-1 touch-manipulation select-none text-destructive hover:text-destructive"
        aria-label="Delete bullet"
        onPointerDown={(e) => toolbarPointerAction(e, keepEditingBullet, onDelete)}
      >
        <Trash2 className="size-5.5" aria-hidden />
      </Button>
    </div>
  );
}
