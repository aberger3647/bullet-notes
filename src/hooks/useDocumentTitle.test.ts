import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentTitle } from './useDocumentTitle';
import { node, threeLevel } from '../test/factories';
import type { BulletNode } from '../state/types';

describe('useDocumentTitle', () => {
  it('sets "Home" when at the root (empty zoom path)', () => {
    renderHook(() => useDocumentTitle([node('a')], []));
    expect(document.title).toBe('Home');
  });

  it('uses the zoomed node’s text', () => {
    renderHook(() => useDocumentTitle([node('a', [], { text: 'My Page' })], ['a']));
    expect(document.title).toBe('My Page');
  });

  it('falls back to "Untitled" for an empty zoomed node', () => {
    renderHook(() => useDocumentTitle([node('a', [], { text: '' })], ['a']));
    expect(document.title).toBe('Untitled');
  });

  it('updates when the props change', () => {
    const { rerender } = renderHook(
      ({ tree, zoomPath }: { tree: BulletNode[]; zoomPath: string[] }) =>
        useDocumentTitle(tree, zoomPath),
      { initialProps: { tree: threeLevel(), zoomPath: [] as string[] } },
    );
    expect(document.title).toBe('Home');
    rerender({ tree: threeLevel(), zoomPath: ['a', 'b', 'c'] });
    expect(document.title).toBe('c');
  });
});
