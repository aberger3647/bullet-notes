import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useRef, useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import type { BulletNode } from '../state/types';

export type BulletRowProps = {
  node: BulletNode;
  expanded: boolean;
  onToggleExpand: () => void;
  /** When indenting via Tab, expand this id (the new parent). */
  indentParentId?: string;
  onEnsureExpanded?: (id: string) => void;
  /** DOM id of the inline children region (sibling under outline item), for aria-controls */
  childRegionId?: string;
};

function UsersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

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

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-.6 13.2A2 2 0 0 1 16.4 21H7.6a2 2 0 0 1-2-1.8L5 6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 11v6" />
    </svg>
  );
}

export function BulletRow({
  node,
  expanded,
  onToggleExpand,
  indentParentId,
  onEnsureExpanded,
  childRegionId,
}: BulletRowProps) {
  const { state, dispatch, shareNode, setEditingBullet, scheduleClearEditingBullet } = useAppState();
  const editRef = useRef<HTMLDivElement>(null);
  const [shareBusy, setShareBusy] = useState(false);

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
    if (!el || document.activeElement === el) return;
    if (el.textContent !== node.text) {
      el.textContent = node.text;
    }
  }, [node.text]);

  useEffect(() => {
    if (state.focusedId === node.id) {
      const el = editRef.current;
      if (el) {
        el.focus();
        if (state.focusCaret === 'end') placeCaretAtEnd(el);
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

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      dispatch({ type: 'TOGGLE_COMPLETE', id: node.id });
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
    if (e.key === 'Backspace' && node.text === '' && node.children.length === 0) {
      const el = editRef.current;
      if (el && isCaretAtStart(el)) {
        e.preventDefault();
        dispatch({ type: 'DELETE_NODE', id: node.id });
      }
    }
  };

  const onDeleteClick = () => {
    if (node.children.length > 0) {
      const label = node.text.trim() || 'this bullet';
      if (!window.confirm(`Delete “${label}” and all of its sub-bullets?`)) return;
    }
    dispatch({ type: 'DELETE_NODE', id: node.id });
  };

  const onInput = (e: React.FormEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const raw = el.textContent ?? '';
    const text = raw.replace(/\u00a0/g, ' ').replace(/\n/g, '');
    if (raw !== text) {
      el.textContent = text;
      selectAllContents(el);
    }
    dispatch({ type: 'SET_TEXT', id: node.id, text });
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain').replace(/\r?\n/g, ' ');
    document.execCommand('insertText', false, text);
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
      className={`bullet-row ${node.completed ? 'completed' : ''} ${isShared ? 'bullet-row--shared' : ''}`}
    >
      <div className="share-slot">
        <button
          type="button"
          className={`share-btn ${isShared ? 'share-btn--active' : ''}`}
          aria-label={isShared ? 'Shared — tap to share link' : 'Share this bullet'}
          disabled={shareBusy}
          onClick={(e) => {
            e.stopPropagation();
            onShareClick();
          }}
        >
          <UsersIcon />
        </button>
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
        className={`bullet-marker ${hasChildren ? 'bullet-marker--parent' : 'bullet-marker--leaf'}`}
        aria-label="Open sub-bullets in page view"
        onClick={() =>
          dispatch({
            type: 'ZOOM_INTO',
            id: node.id,
            ...(hasChildren ? {} : { newChildId: crypto.randomUUID() }),
          })
        }
        {...attributes}
        {...listeners}
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
        contentEditable
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
        onFocus={() => setEditingBullet(node.id, indentParentId)}
        onBlur={() => scheduleClearEditingBullet()}
      />

      <div className="delete-slot">
        <button
          type="button"
          className="delete-btn"
          aria-label="Delete this bullet"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteClick();
          }}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}
