import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useBulletDragSelect } from './useBulletDragSelect';

function makeRow(id: string): HTMLElement {
  const el = document.createElement('div');
  el.dataset.bulletId = id;
  document.body.appendChild(el);
  return el;
}

function mouseDownEvent(button = 0): ReactMouseEvent {
  return { button } as ReactMouseEvent;
}

describe('useBulletDragSelect', () => {
  let rowA: HTMLElement;
  let rowB: HTMLElement;
  let rowC: HTMLElement;
  let selectRange: ReturnType<typeof vi.fn>;
  let clearSelection: ReturnType<typeof vi.fn>;
  let elementFromPointSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    rowA = makeRow('a');
    rowB = makeRow('b');
    rowC = makeRow('c');
    selectRange = vi.fn();
    clearSelection = vi.fn();
    elementFromPointSpy = vi.fn().mockReturnValue(null);
    document.elementFromPoint = elementFromPointSpy as unknown as typeof document.elementFromPoint;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  function moveTo(el: Element) {
    elementFromPointSpy.mockReturnValue(el);
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, clientY: 0 }));
  }

  function mouseUp() {
    document.dispatchEvent(new MouseEvent('mouseup'));
  }

  function start(nodeId = 'a') {
    const { result, unmount } = renderHook(() => useBulletDragSelect(nodeId, selectRange, clearSelection));
    result.current.onMouseDown(mouseDownEvent());
    return { result, unmount };
  }

  it('calls clearSelection synchronously on mousedown', () => {
    start('a');
    expect(clearSelection).toHaveBeenCalledTimes(1);
  });

  it('ignores non-primary mouse buttons (e.g. right-click)', () => {
    const { result } = renderHook(() => useBulletDragSelect('a', selectRange, clearSelection));
    result.current.onMouseDown(mouseDownEvent(2));
    expect(clearSelection).not.toHaveBeenCalled();
    moveTo(rowB);
    expect(selectRange).not.toHaveBeenCalled();
  });

  it('dragging within the same bullet never calls selectRange', () => {
    start('a');
    moveTo(rowA);
    expect(selectRange).not.toHaveBeenCalled();
  });

  it('crossing into a different bullet calls selectRange(startId) then selectRange(overId)', () => {
    start('a');
    moveTo(rowB);
    expect(selectRange).toHaveBeenNthCalledWith(1, 'a');
    expect(selectRange).toHaveBeenNthCalledWith(2, 'b');
    expect(selectRange).toHaveBeenCalledTimes(2);
  });

  it('crossing into a third bullet only calls selectRange for the new id (anchor set once)', () => {
    start('a');
    moveTo(rowB);
    moveTo(rowC);
    expect(selectRange).toHaveBeenNthCalledWith(1, 'a');
    expect(selectRange).toHaveBeenNthCalledWith(2, 'b');
    expect(selectRange).toHaveBeenNthCalledWith(3, 'c');
    expect(selectRange).toHaveBeenCalledTimes(3);
  });

  it('clears the native window selection exactly once, at the first crossing', () => {
    const removeAllRanges = vi.fn();
    vi.spyOn(window, 'getSelection').mockReturnValue({ removeAllRanges } as unknown as Selection);
    start('a');
    moveTo(rowA); // same bullet — shouldn't clear
    expect(removeAllRanges).not.toHaveBeenCalled();
    moveTo(rowB);
    expect(removeAllRanges).toHaveBeenCalledTimes(1);
    moveTo(rowC);
    expect(removeAllRanges).toHaveBeenCalledTimes(1);
  });

  it('mouseup stops tracking — further crossings do not call selectRange', () => {
    start('a');
    moveTo(rowB);
    expect(selectRange).toHaveBeenCalledTimes(2);
    mouseUp();
    moveTo(rowC);
    expect(selectRange).toHaveBeenCalledTimes(2);
  });

  it('unmounting mid-drag removes the document mousemove/mouseup listeners', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = start('a');
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
  });
});
