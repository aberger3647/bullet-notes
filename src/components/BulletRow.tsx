import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useRef } from 'react';
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

export function BulletRow({
  node,
  expanded,
  onToggleExpand,
  indentParentId,
  onEnsureExpanded,
  childRegionId,
}: BulletRowProps) {
  const { state, dispatch } = useAppState();
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div ref={setNodeRef} style={style} className={`bullet-row ${node.completed ? 'completed' : ''}`}>
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
        aria-label="Bullet text"
      />

    </div>
  );
}
