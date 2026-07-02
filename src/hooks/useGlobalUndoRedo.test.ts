import { describe, it, expect, vi } from 'vitest';
import { renderHook, fireEvent } from '@testing-library/react';
import { useGlobalUndoRedo } from './useGlobalUndoRedo';

describe('useGlobalUndoRedo', () => {
  it('dispatches UNDO on Cmd/Ctrl+Z', () => {
    const dispatch = vi.fn();
    renderHook(() => useGlobalUndoRedo(dispatch));
    fireEvent.keyDown(document.body, { key: 'z', metaKey: true });
    expect(dispatch).toHaveBeenCalledWith({ type: 'UNDO' });
  });

  it('dispatches REDO on Cmd/Ctrl+Shift+Z', () => {
    const dispatch = vi.fn();
    renderHook(() => useGlobalUndoRedo(dispatch));
    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(dispatch).toHaveBeenCalledWith({ type: 'REDO' });
  });

  it('dispatches REDO on Ctrl+Y (Windows)', () => {
    const dispatch = vi.fn();
    renderHook(() => useGlobalUndoRedo(dispatch));
    fireEvent.keyDown(document.body, { key: 'y', ctrlKey: true });
    expect(dispatch).toHaveBeenCalledWith({ type: 'REDO' });
  });

  it('skips when the keystroke targets a plain INPUT / TEXTAREA (e.g. Settings fields)', () => {
    const dispatch = vi.fn();
    renderHook(() => useGlobalUndoRedo(dispatch));

    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: 'z', metaKey: true });

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    fireEvent.keyDown(textarea, { key: 'z', metaKey: true });

    expect(dispatch).not.toHaveBeenCalled();
    input.remove();
    textarea.remove();
  });

  it('still dispatches UNDO when the keystroke targets a contentEditable bullet field', () => {
    const dispatch = vi.fn();
    renderHook(() => useGlobalUndoRedo(dispatch));

    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    // jsdom does not compute isContentEditable from the attribute; force it.
    Object.defineProperty(editable, 'isContentEditable', { value: true });
    document.body.appendChild(editable);
    fireEvent.keyDown(editable, { key: 'z', metaKey: true });

    expect(dispatch).toHaveBeenCalledWith({ type: 'UNDO' });
    editable.remove();
  });

  it('does not attach a listener when disabled', () => {
    const dispatch = vi.fn();
    renderHook(() => useGlobalUndoRedo(dispatch, false));
    fireEvent.keyDown(document.body, { key: 'z', metaKey: true });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('removes the listener on unmount', () => {
    const dispatch = vi.fn();
    const { unmount } = renderHook(() => useGlobalUndoRedo(dispatch));
    unmount();
    fireEvent.keyDown(document.body, { key: 'z', metaKey: true });
    expect(dispatch).not.toHaveBeenCalled();
  });
});
