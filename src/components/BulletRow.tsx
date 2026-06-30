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

export function BulletRow({
  node,
  expanded,
  onToggleExpand,
  indentParentId,
  onEnsureExpanded,
  childRegionId,
}: BulletRowProps) {
  const { state, dispatch, shareNode, setEditingBullet, clearEditingBullet } = useAppState();
  const inputRef = useRef<HTMLInputElement>(null);
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
    if (state.focusedId === node.id) {
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.select();
      }
      dispatch({ type: 'SET_FOCUSED', id: null });
    }
  }, [state.focusedId, node.id, dispatch]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    }
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

      <input
        ref={inputRef}
        className="bullet-input"
        value={node.text}
        onChange={(e) => dispatch({ type: 'SET_TEXT', id: node.id, text: e.target.value })}
        onKeyDown={onKeyDown}
        onFocus={() => setEditingBullet(node.id, indentParentId)}
        onBlur={() => clearEditingBullet()}
        aria-label="Bullet text"
      />
    </div>
  );
}
