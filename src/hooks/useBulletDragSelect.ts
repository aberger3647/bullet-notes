import { useCallback, useEffect, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

/**
 * Extends whole-bullet range selection (`selectRange`) into a mouse-drag gesture: dragging
 * from one bullet's text into a sibling's selects the whole-bullet range between them,
 * since each bullet is its own independent contentEditable and can't natively extend a
 * text selection across that boundary. Dragging within a single bullet is left untouched.
 */
export function useBulletDragSelect(
  nodeId: string,
  selectRange: (id: string) => void,
  clearSelection: () => void,
) {
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => () => stopRef.current?.(), []);

  const onMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      if (e.button !== 0) return;
      clearSelection();

      let crossed = false;
      let lastOverId = nodeId;

      const onMouseMove = (ev: MouseEvent) => {
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const rowEl = el instanceof Element ? el.closest<HTMLElement>('[data-bullet-id]') : null;
        const overId = rowEl?.dataset.bulletId;
        if (!overId || overId === lastOverId) return;
        if (!crossed) {
          window.getSelection()?.removeAllRanges();
          selectRange(nodeId);
          crossed = true;
        }
        selectRange(overId);
        lastOverId = overId;
      };

      const stop = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', stop);
        stopRef.current = null;
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', stop);
      stopRef.current = stop;
    },
    [nodeId, selectRange, clearSelection],
  );

  return { onMouseDown };
}
