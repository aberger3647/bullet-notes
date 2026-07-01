import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAppState } from './useAppState';

describe('useAppState', () => {
  it('throws a clear error when used outside AppStateProvider', () => {
    // Suppress React's error-boundary console noise for the expected throw.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAppState())).toThrow(
      'useAppState must be used within AppStateProvider',
    );
    spy.mockRestore();
  });
});
