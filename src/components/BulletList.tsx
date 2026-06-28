import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useMemo, useRef } from 'react';
import { useAppState } from '../hooks/useAppState';
import type { BulletNode } from '../state/types';
import { findNodeById } from '../state/treeOps';
import { BulletRow } from './BulletRow';

function filterVisible(nodes: BulletNode[], hideCompleted: boolean): BulletNode[] {
  return hideCompleted ? nodes.filter((n) => !n.completed) : nodes;
}

type OutlineRowsProps = {
  nodes: BulletNode[];
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onEnsureExpanded: (id: string) => void;
};

function OutlineRows({ nodes, expanded, onToggleExpand, onEnsureExpanded }: OutlineRowsProps) {
  const { state } = useAppState();
  const hideCompleted = state.settings.hideCompleted;
  const visible = useMemo(
    () => filterVisible(nodes, hideCompleted),
    [nodes, hideCompleted],
  );
  const ids = useMemo(() => visible.map((n) => n.id), [visible]);

  if (visible.length === 0) return null;

  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <div className="outline-block" role="presentation">
        {visible.map((node, idx) => {
          const isOpen = expanded.has(node.id);
          const hasChildren = node.children.length > 0;
          const regionId = hasChildren ? `outline-children-${node.id}` : undefined;
          const indentParentId = idx > 0 ? visible[idx - 1]!.id : undefined;
          return (
            <div key={node.id} className="outline-item">
              <BulletRow
                node={node}
                expanded={isOpen}
                onToggleExpand={() => onToggleExpand(node.id)}
                indentParentId={indentParentId}
                onEnsureExpanded={onEnsureExpanded}
                childRegionId={regionId}
              />
              {hasChildren ? (
                <div id={regionId} className="outline-children" hidden={!isOpen}>
                  {isOpen ? (
                    <OutlineRows
                      nodes={node.children}
                      expanded={expanded}
                      onToggleExpand={onToggleExpand}
                      onEnsureExpanded={onEnsureExpanded}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </SortableContext>
  );
}

export function BulletList() {
  const { visibleChildren, dispatch, state, expanded, toggleExpand, ensureExpanded } = useAppState();
  const hoverExpand = useRef<{ overId: string; timer: ReturnType<typeof setTimeout> } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;
    const nest = (delta?.x ?? 0) > 28;
    dispatch({ type: 'MOVE_NODE', activeId, overId, nest });
  };

  const onDragOver = (event: DragOverEvent) => {
    const { over, active, delta } = event;
    if (!over) return;
    const overId = String(over.id);
    const activeId = String(active.id);
    if (overId === activeId) return;

    // If the user is trying to nest (dragging to the right), auto-expand the hovered parent
    // so they can drop onto a specific child row.
    const nestIntent = (delta?.x ?? 0) > 28;
    if (!nestIntent) return;

    const overNode = findNodeById(state.tree, overId);
    if (!overNode || overNode.children.length === 0) return;
    if (expanded.has(overId)) return;

    if (hoverExpand.current?.overId === overId) return;
    if (hoverExpand.current) clearTimeout(hoverExpand.current.timer);

    const timer = setTimeout(() => ensureExpanded(overId), 250);
    hoverExpand.current = { overId, timer };
  };

  if (visibleChildren.length === 0) {
    return <p className="empty-hint">No bullets to show here.</p>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragOver={onDragOver}
      onDragEnd={(e) => {
        if (hoverExpand.current) {
          clearTimeout(hoverExpand.current.timer);
          hoverExpand.current = null;
        }
        onDragEnd(e);
      }}
    >
      <div className="bullet-list" role="list">
        <OutlineRows
          nodes={visibleChildren}
          expanded={expanded}
          onToggleExpand={toggleExpand}
          onEnsureExpanded={ensureExpanded}
        />
      </div>
    </DndContext>
  );
}
