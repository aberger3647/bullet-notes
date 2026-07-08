import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useMemo, useRef, useState, type CSSProperties } from 'react';
import { useAppState } from '../hooks/useAppState';
import type { BulletNode } from '../state/types';
import { findNodeById, flattenVisibleTree, getVisibleOrder, type FlattenedRow } from '../state/treeOps';
import { getDragDepth, getProjection, computeDropTarget, INDENT_WIDTH_PX } from '../state/dragProjection';
import { BulletRow, BulletRowOverlay, type DragState } from './BulletRow';

const INDENT_COLOR_COUNT = 6;

function filterVisible(nodes: BulletNode[], hideCompleted: boolean): BulletNode[] {
  return hideCompleted ? nodes.filter((n) => !n.completed) : nodes;
}

type NavMap = Map<string, { prevId?: string; nextId?: string }>;

function buildNavMap(order: string[]): NavMap {
  const map: NavMap = new Map();
  order.forEach((id, i) => {
    map.set(id, {
      prevId: i > 0 ? order[i - 1] : undefined,
      nextId: i < order.length - 1 ? order[i + 1] : undefined,
    });
  });
  return map;
}

type Projection = {
  items: FlattenedRow[];
  depth: number;
  parentId: string | null;
  insertion: 'before' | 'after';
};

/**
 * Live drag-placement math, recomputed fresh from the current tree on every call rather than
 * cached from drag-start — keeps it correct if a remote collaborator's edit lands mid-drag, or
 * the auto-expand-on-hover affordance changes `expanded` mid-drag. Shared by the live preview
 * and the final dispatch, so what's shown while dragging can never disagree with what's
 * committed on drop.
 */
function resolveProjection(
  visibleChildren: BulletNode[],
  expanded: Set<string>,
  hideCompleted: boolean,
  activeId: string,
  overId: string,
  deltaX: number,
): Projection | null {
  const flat = flattenVisibleTree(visibleChildren, expanded, hideCompleted, activeId);
  const oldIndex = flat.findIndex((r) => r.id === activeId);
  const overIndex = flat.findIndex((r) => r.id === overId);
  if (oldIndex === -1 || overIndex === -1) return null;

  // arrayMove's own direction convention: dragging past the target lands after it; dragging up
  // onto it lands before. Reusing this (rather than always "insert before", as the old
  // cross-parent move did) is what fixes downward cross-parent drags landing in the wrong spot.
  const insertion: 'before' | 'after' = oldIndex < overIndex ? 'after' : 'before';
  const reordered = arrayMove(flat, oldIndex, overIndex);
  const projectedDepth = flat[oldIndex]!.depth + getDragDepth(deltaX, INDENT_WIDTH_PX);
  const projection = getProjection(reordered, activeId, projectedDepth);
  const items = reordered.map((r) =>
    r.id === activeId ? { ...r, depth: projection.depth, parentId: projection.parentId } : r,
  );
  return { items, depth: projection.depth, parentId: projection.parentId, insertion };
}

type OutlineRowsProps = {
  nodes: BulletNode[];
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onEnsureExpanded: (id: string) => void;
  nav: NavMap;
  depth: number;
  dragState: DragState | null;
};

function OutlineRows({ nodes, expanded, onToggleExpand, onEnsureExpanded, nav, depth, dragState }: OutlineRowsProps) {
  const { state } = useAppState();
  const hideCompleted = state.settings.hideCompleted;
  const visible = useMemo(
    () => filterVisible(nodes, hideCompleted),
    [nodes, hideCompleted],
  );

  if (visible.length === 0) return null;

  return (
    <div className="outline-block" role="presentation">
      {visible.map((node, idx) => {
        const isOpen = expanded.has(node.id);
        const hasChildren = node.children.length > 0;
        // Hide the dragged node's own subtree for the duration of the drag — it can't be a
        // drop target for itself, and this keeps the rendered rows in sync with the flattened
        // (excludeSubtreeOf-filtered) order backing the single SortableContext below.
        const suppressChildren = dragState?.activeId === node.id;
        const regionId = hasChildren ? `outline-children-${node.id}` : undefined;
        const indentParentId = idx > 0 ? visible[idx - 1]!.id : undefined;
        const navEntry = nav.get(node.id);
        return (
          <div key={node.id} className="outline-item">
            <BulletRow
              node={node}
              expanded={isOpen}
              onToggleExpand={() => onToggleExpand(node.id)}
              indentParentId={indentParentId}
              onEnsureExpanded={onEnsureExpanded}
              childRegionId={regionId}
              prevVisibleId={navEntry?.prevId}
              nextVisibleId={navEntry?.nextId}
              dragState={dragState}
            />
            {hasChildren ? (
              <div
                id={regionId}
                className="outline-children"
                hidden={!isOpen || suppressChildren}
                style={
                  {
                    '--indent-color': `var(--indent-depth-${depth % INDENT_COLOR_COUNT})`,
                  } as CSSProperties
                }
              >
                {isOpen && !suppressChildren ? (
                  <OutlineRows
                    nodes={node.children}
                    expanded={expanded}
                    onToggleExpand={onToggleExpand}
                    onEnsureExpanded={onEnsureExpanded}
                    nav={nav}
                    depth={depth + 1}
                    dragState={dragState}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function BulletList() {
  const { visibleChildren, dispatch, state, expanded, toggleExpand, ensureExpanded } = useAppState();
  const hoverExpand = useRef<{ overId: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    // Touch requires a deliberate hold (not just movement) before a drag starts, so an ordinary
    // scroll or tap that happens to start on the marker isn't mistaken for a drag — the classic
    // dnd-kit API can't vary this per pointer type on a single sensor, so it's a separate sensor
    // instance rather than a branch inside PointerSensor's activationConstraint.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const clearHoverExpand = () => {
    if (hoverExpand.current) {
      clearTimeout(hoverExpand.current.timer);
      hoverExpand.current = null;
    }
  };

  // Auto-expand a collapsed hover target after a short hold, so the user can drop onto one of
  // its specific children without needing to expand it manually first. Retargeted from the old
  // binary "dragged >28px right" threshold to the live projection: trigger exactly when the
  // active node's projected parent is the row currently being hovered.
  const handleAutoExpandHover = (overId: string, projectedParentId: string | null) => {
    if (projectedParentId !== overId) {
      clearHoverExpand();
      return;
    }
    const overNode = findNodeById(state.tree, overId);
    if (!overNode || overNode.children.length === 0) return;
    if (expanded.has(overId)) return;
    if (hoverExpand.current?.overId === overId) return;
    clearHoverExpand();
    const timer = setTimeout(() => ensureExpanded(overId), 250);
    hoverExpand.current = { overId, timer };
  };

  const onDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);
    const loc = flattenVisibleTree(visibleChildren, expanded, state.settings.hideCompleted).find(
      (r) => r.id === activeId,
    );
    setDragState({
      activeId,
      overId: null,
      depth: loc?.depth ?? 0,
      parentId: loc?.parentId ?? null,
      insertion: 'after',
    });
  };

  const onDragMove = (event: DragMoveEvent) => {
    const { active, over, delta } = event;
    const activeId = String(active.id);
    if (!over) return;
    const overId = String(over.id);
    if (overId === activeId) {
      clearHoverExpand();
      return;
    }
    const result = resolveProjection(
      visibleChildren,
      expanded,
      state.settings.hideCompleted,
      activeId,
      overId,
      delta?.x ?? 0,
    );
    if (!result) return;
    setDragState({ activeId, overId, depth: result.depth, parentId: result.parentId, insertion: result.insertion });
    handleAutoExpandHover(overId, result.parentId);
  };

  const onDragEnd = (event: DragEndEvent) => {
    clearHoverExpand();
    setDragState(null);
    const { active, over, delta } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;
    const result = resolveProjection(
      visibleChildren,
      expanded,
      state.settings.hideCompleted,
      activeId,
      overId,
      delta?.x ?? 0,
    );
    if (!result) return;
    const { newParentId, index } = computeDropTarget(result.items, activeId);
    dispatch({ type: 'MOVE_NODE', activeId, newParentId, index });
  };

  const onDragCancel = () => {
    clearHoverExpand();
    setDragState(null);
  };

  const activeNode = dragState ? findNodeById(state.tree, dragState.activeId) : null;

  // Single flat order spanning every visible depth (not one list per nesting level) — this is
  // the fix for the reported bug: dnd-kit's reflow animation only "makes room" for items within
  // the same SortableContext, so a per-level context can't animate a cross-parent drop. While a
  // drag is active, the dragged node's own subtree is excluded (see OutlineRows' suppressChildren)
  // since those rows aren't rendered for the duration.
  const visibleOrder = useMemo(
    () => flattenVisibleTree(visibleChildren, expanded, state.settings.hideCompleted, dragState?.activeId).map((r) => r.id),
    [visibleChildren, expanded, state.settings.hideCompleted, dragState?.activeId],
  );

  const nav = useMemo(
    () => buildNavMap(getVisibleOrder(visibleChildren, expanded, state.settings.hideCompleted)),
    [visibleChildren, expanded, state.settings.hideCompleted],
  );

  if (visibleChildren.length === 0) {
    return <p className="text-[0.95rem] text-muted-foreground">No bullets to show here.</p>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <SortableContext items={visibleOrder} strategy={verticalListSortingStrategy}>
        <div className="bullet-list" role="list">
          <OutlineRows
            nodes={visibleChildren}
            expanded={expanded}
            onToggleExpand={toggleExpand}
            onEnsureExpanded={ensureExpanded}
            nav={nav}
            depth={0}
            dragState={dragState}
          />
        </div>
      </SortableContext>
      <DragOverlay>{activeNode ? <BulletRowOverlay node={activeNode} /> : null}</DragOverlay>
    </DndContext>
  );
}
