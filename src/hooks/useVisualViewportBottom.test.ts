import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVisualViewportBottom } from './useVisualViewportBottom';

type Handler = (e?: Event) => void;

function makeViewport(height: number, offsetTop = 0) {
  const handlers: Record<string, Handler[]> = {};
  return {
    height,
    offsetTop,
    addEventListener: (type: string, h: Handler) => {
      (handlers[type] ??= []).push(h);
    },
    removeEventListener: vi.fn((type: string, h: Handler) => {
      handlers[type] = (handlers[type] ?? []).filter((x) => x !== h);
    }),
    emit(type: string) {
      (handlers[type] ?? []).forEach((h) => h());
    },
  };
}

const originalVV = window.visualViewport;

beforeEach(() => {
  // Run rAF callbacks synchronously so the hook updates within the same tick.
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 800 });
});

afterEach(() => {
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    writable: true,
    value: originalVV,
  });
});

describe('useVisualViewportBottom', () => {
  it('computes the initial keyboard inset (innerHeight - vv.height - offsetTop)', () => {
    const vv = makeViewport(500);
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv });
    const { result } = renderHook(() => useVisualViewportBottom());
    expect(result.current).toBe(300); // 800 - 500 - 0
  });

  it('updates on a viewport resize event', () => {
    const vv = makeViewport(500);
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv });
    const { result } = renderHook(() => useVisualViewportBottom());
    expect(result.current).toBe(300);

    vv.height = 650;
    act(() => vv.emit('resize'));
    expect(result.current).toBe(150); // 800 - 650
  });

  it('never returns a negative inset', () => {
    const vv = makeViewport(900); // larger than innerHeight
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv });
    const { result } = renderHook(() => useVisualViewportBottom());
    expect(result.current).toBe(0);
  });

  it('cleans up its listeners on unmount', () => {
    const vv = makeViewport(500);
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv });
    const { unmount } = renderHook(() => useVisualViewportBottom());
    unmount();
    expect(vv.removeEventListener).toHaveBeenCalled();
  });
});
