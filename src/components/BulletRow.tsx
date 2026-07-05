import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useRef, useState } from 'react';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAppState } from '../hooks/useAppState';
import { useBulletDragSelect } from '../hooks/useBulletDragSelect';
import type { BulletNode } from '../state/types';
import {
  isOnlyTopLevelNode,
  OUTLINE_CLIPBOARD_MIME,
  parseOutlineClipboardJSON,
  serializeOutlineClipboardJSON,
  serializeOutlineClipboardText,
} from '../state/treeOps';
import { revokeSharesInSubtree } from '../sync/sharesApi';
import { colorForClientId } from '../lib/presenceColor';
import { looksLikeOutlineText, parseImportedOutline } from '../lib/importOutline';
import { htmlHasListStructure, parseHtmlOutline } from '../lib/htmlOutline';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const SWIPE_REVEAL_MAX = -88;
const SWIPE_DELETE_THRESHOLD = -72;

export type BulletRowProps = {
  node: BulletNode;
  expanded: boolean;
  onToggleExpand: () => void;
  /** When indenting via Tab, expand this id (the new parent). */
  indentParentId?: string;
  onEnsureExpanded?: (id: string) => void;
  /** DOM id of the inline children region (sibling under outline item), for aria-controls */
  childRegionId?: string;
  /** Id of the previous/next bullet in on-screen order, for ArrowUp/ArrowDown navigation. */
  prevVisibleId?: string;
  nextVisibleId?: string;
};

function selectAllContents(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function isCaretAtStart(el: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  if (!el.contains(range.startContainer)) return false;
  const preRange = range.cloneRange();
  preRange.selectNodeContents(el);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length === 0;
}

function getCaretOffset(el: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  if (!el.contains(range.startContainer)) return 0;
  const preRange = range.cloneRange();
  preRange.selectNodeContents(el);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length;
}

function placeCaretAtOffset(el: HTMLElement, offset: number) {
  const textNode = el.firstChild;
  const range = document.createRange();
  if (!textNode) {
    range.selectNodeContents(el);
  } else {
    const len = textNode.textContent?.length ?? 0;
    range.setStart(textNode, Math.max(0, Math.min(offset, len)));
    range.collapse(true);
  }
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

/** Insert `text` at the caret via the Range API (execCommand is deprecated/unreliable in tests). */
function insertTextAtCaret(el: HTMLElement, text: string) {
  const sel = window.getSelection();
  const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
  if (range && el.contains(range.commonAncestorContainer)) {
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    sel!.removeAllRanges();
    sel!.addRange(range);
  } else {
    el.textContent = (el.textContent ?? '') + text;
    placeCaretAtEnd(el);
  }
  el.normalize();
}

/** Whether the caret offset falls on the first/last `\n`-delimited line of `text`. */
function caretLineInfo(text: string, offset: number): { onFirstLine: boolean; onLastLine: boolean } {
  return {
    onFirstLine: !text.slice(0, offset).includes('\n'),
    onLastLine: !text.slice(offset).includes('\n'),
  };
}

export function BulletRow({
  node,
  expanded,
  onToggleExpand,
  indentParentId,
  onEnsureExpanded,
  childRegionId,
  prevVisibleId,
  nextVisibleId,
}: BulletRowProps) {
  const {
    state,
    dispatch,
    shareNode,
    setEditingBullet,
    scheduleClearEditingBullet,
    readOnly,
    otherPresences,
    selectedIds,
    selectRange,
    clearSelection,
  } = useAppState();
  const editors = otherPresences.filter((p) => p.editingId === node.id);
  const isSelected = selectedIds.has(node.id);
  const { onMouseDown: onDragSelectMouseDown } = useBulletDragSelect(node.id, selectRange, clearSelection);
  const editRef = useRef<HTMLDivElement>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeRef = useRef<{ pointerId: number; startX: number; startY: number; tracking: boolean } | null>(
    null,
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  useEffect(() => {
    const el = editRef.current;
    if (!el || el.textContent === node.text) return;
    // While focused, this only means the text changed for a reason other than
    // the user's own typing here (e.g. undo/redo, or another client's edit on
    // a shared doc) — apply it but preserve the caret position.
    if (document.activeElement === el) {
      const offset = getCaretOffset(el);
      el.textContent = node.text;
      placeCaretAtOffset(el, offset);
    } else {
      el.textContent = node.text;
    }
  }, [node.text]);

  useEffect(() => {
    if (state.focusedId === node.id) {
      const el = editRef.current;
      if (el) {
        el.focus();
        if (state.focusCaret === 'end') placeCaretAtEnd(el);
        else if (typeof state.focusCaret === 'object') placeCaretAtOffset(el, state.focusCaret.offset);
        else selectAllContents(el);
      }
      dispatch({ type: 'SET_FOCUSED', id: null });
    }
  }, [state.focusedId, state.focusCaret, node.id, dispatch]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  const commitText = (el: HTMLDivElement) => {
    const raw = el.textContent ?? '';
    const text = raw.replace(/\u00a0/g, ' ');
    if (raw !== text) {
      el.textContent = text;
      selectAllContents(el);
    }
    dispatch({ type: 'SET_TEXT', id: node.id, text });
  };

  const deleteThisBullet = () => {
    if (isOnlyTopLevelNode(state.tree, node.id)) {
      toast('Add another bullet before deleting this one', { duration: 2000 });
      return;
    }
    revokeSharesInSubtree(state.tree, node.id);
    dispatch({ type: 'CLEAR_NODE_SHARES', id: node.id });
    dispatch({ type: 'DELETE_NODE', id: node.id });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (readOnly) return;
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      dispatch({ type: 'TOGGLE_COMPLETE', id: node.id });
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      dispatch({ type: 'DUPLICATE_NODE', id: node.id, newId: crypto.randomUUID() });
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Backspace') {
      e.preventDefault();
      deleteThisBullet();
      return;
    }
    if ((e.key === 'Enter' || e.code === 'NumpadEnter') && e.shiftKey) {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      const el = editRef.current;
      if (el) {
        insertTextAtCaret(el, '\n');
        commitText(el);
      }
      return;
    }
    if ((e.key === 'Enter' || e.code === 'NumpadEnter') && !e.shiftKey) {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      dispatch({ type: 'NEW_SIBLING_AFTER', afterId: node.id, newId: crypto.randomUUID() });
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) dispatch({ type: 'OUTDENT', id: node.id });
      else {
        dispatch({ type: 'INDENT', id: node.id });
        if (indentParentId && onEnsureExpanded) onEnsureExpanded(indentParentId);
      }
      return;
    }
    if (e.key === 'Backspace') {
      const el = editRef.current;
      if (el && isCaretAtStart(el)) {
        if (node.text === '' && node.children.length === 0) {
          e.preventDefault();
          deleteThisBullet();
          return;
        }
        if (node.text !== '' && prevVisibleId) {
          e.preventDefault();
          dispatch({ type: 'MERGE_WITH_PREVIOUS', id: node.id, targetId: prevVisibleId });
          return;
        }
      }
    }
    if (
      (e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey
    ) {
      const el = editRef.current;
      const offset = el ? getCaretOffset(el) : 0;
      const { onFirstLine, onLastLine } = caretLineInfo(node.text, offset);
      if (e.key === 'ArrowUp' && !onFirstLine) return;
      if (e.key === 'ArrowDown' && !onLastLine) return;
      const targetId = e.key === 'ArrowUp' ? prevVisibleId : nextVisibleId;
      if (!targetId) return;
      e.preventDefault();
      dispatch({ type: 'SET_FOCUSED', id: targetId, caret: { offset } });
    }
  };

  const onInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (readOnly) return;
    commitText(e.currentTarget);
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (readOnly) return;
    const outlineJson = e.clipboardData.getData(OUTLINE_CLIPBOARD_MIME);
    const subtree = outlineJson ? parseOutlineClipboardJSON(outlineJson) : null;
    if (subtree) {
      dispatch({ type: 'PASTE_SUBTREE', afterId: node.id, subtree, newId: crypto.randomUUID() });
      return;
    }
    const html = e.clipboardData.getData('text/html');
    if (html && htmlHasListStructure(html)) {
      const roots = parseHtmlOutline(html, () => crypto.randomUUID());
      if (roots.length > 0) {
        dispatch({ type: 'PASTE_OUTLINE', afterId: node.id, roots, newId: crypto.randomUUID() });
        return;
      }
    }

    const text = e.clipboardData.getData('text/plain').replace(/\r\n/g, '\n');
    if (looksLikeOutlineText(text)) {
      const roots = parseImportedOutline(text, () => crypto.randomUUID());
      if (roots.length > 0) {
        dispatch({ type: 'PASTE_OUTLINE', afterId: node.id, roots, newId: crypto.randomUUID() });
        return;
      }
    }

    insertTextAtCaret(e.currentTarget, text);
    commitText(e.currentTarget);
  };

  const onCopy = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return; // let default text-selection copy proceed
    e.preventDefault();
    e.clipboardData.setData('text/plain', serializeOutlineClipboardText(node));
    e.clipboardData.setData(OUTLINE_CLIPBOARD_MIME, serializeOutlineClipboardJSON(node));
  };

  const onSwipePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch' || readOnly) return;
    swipeRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, tracking: true };
  };

  const onSwipePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const swipe = swipeRef.current;
    if (!swipe || !swipe.tracking || swipe.pointerId !== e.pointerId) return;
    const dx = e.clientX - swipe.startX;
    const dy = e.clientY - swipe.startY;
    if (Math.abs(dy) > Math.abs(dx)) {
      swipe.tracking = false;
      setSwipeOffset(0);
      return;
    }
    setSwipeOffset(Math.max(dx, SWIPE_REVEAL_MAX));
  };

  const endSwipe = (e: React.PointerEvent<HTMLDivElement>) => {
    const swipe = swipeRef.current;
    if (!swipe || swipe.pointerId !== e.pointerId) return;
    const shouldDelete = swipe.tracking && swipeOffset <= SWIPE_DELETE_THRESHOLD;
    swipeRef.current = null;
    setSwipeOffset(0);
    if (shouldDelete) deleteThisBullet();
  };

  const onSwipePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (swipeRef.current?.pointerId !== e.pointerId) return;
    swipeRef.current = null;
    setSwipeOffset(0);
  };

  const hasChildren = node.children.length > 0;
  const isShared = Boolean(node.shareToken);

  const onShareClick = () => {
    if (shareBusy) return;
    setShareBusy(true);
    void shareNode(node.id)
      .catch(() => {})
      .finally(() => setShareBusy(false));
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-bullet-id={node.id}
      className={cn(
        'bullet-row',
        node.completed && 'completed',
        isShared && 'bullet-row--shared',
        isSelected && 'bullet-row--selected',
      )}
      onPointerDown={onSwipePointerDown}
      onPointerMove={onSwipePointerMove}
      onPointerUp={endSwipe}
      onPointerCancel={onSwipePointerCancel}
    >
      <div className="bullet-row-swipe-action" aria-hidden>
        Delete
      </div>
      <div className="bullet-row-content" style={{ transform: `translateX(${swipeOffset}px)` }}>
      <div className="share-slot">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="share-btn"
          aria-label={isShared ? 'Shared — tap to share link' : 'Share this bullet'}
          disabled={shareBusy}
          onClick={(e) => {
            e.stopPropagation();
            onShareClick();
          }}
        >
          <Users className="size-3.5" aria-hidden />
        </Button>
      </div>

      <div className="disclosure-slot">
        {hasChildren ? (
          <button
            type="button"
            className="disclosure"
            aria-expanded={expanded}
            {...(childRegionId ? { 'aria-controls': childRegionId } : {})}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            aria-label={expanded ? 'Collapse sub-bullets' : 'Expand sub-bullets'}
          >
            <span className="disclosure-triangle" aria-hidden />
          </button>
        ) : (
          <span className="disclosure-spacer" aria-hidden />
        )}
      </div>

      <button
        type="button"
        className={cn(
          'bullet-marker',
          hasChildren ? 'bullet-marker--parent' : 'bullet-marker--leaf',
          isShared && 'bullet-marker--shared',
        )}
        aria-label="Open sub-bullets in page view"
        onClick={(e) => {
          if (e.shiftKey && !readOnly) {
            e.preventDefault();
            selectRange(node.id);
            return;
          }
          dispatch({
            type: 'ZOOM_INTO',
            id: node.id,
            ...(hasChildren || readOnly ? {} : { newChildId: crypto.randomUUID() }),
          });
        }}
        {...(readOnly ? {} : attributes)}
        {...(readOnly ? {} : listeners)}
      >
        {hasChildren ? (
          <span className="bullet-marker-dot" aria-hidden />
        ) : (
          <span className="bullet-marker-ring" aria-hidden />
        )}
      </button>

      <div
        ref={editRef}
        className="bullet-input"
        contentEditable={!readOnly}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="false"
        aria-label="Bullet text"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="sentences"
        onInput={onInput}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onCopy={onCopy}
        onMouseDown={onDragSelectMouseDown}
        onFocus={() => setEditingBullet(node.id, indentParentId)}
        onBlur={() => scheduleClearEditingBullet()}
      />
      {editors.length > 0 ? (
        <span className="presence-badges" aria-hidden={false}>
          {editors.map((p) => (
            <Tooltip key={p.clientId}>
              <TooltipTrigger asChild>
                <span className="presence-badge" style={{ backgroundColor: colorForClientId(p.clientId) }}>
                  {p.displayName}
                </span>
              </TooltipTrigger>
              <TooltipContent>{`${p.displayName} is editing this bullet`}</TooltipContent>
            </Tooltip>
          ))}
        </span>
      ) : null}
      </div>
    </div>
  );
}
