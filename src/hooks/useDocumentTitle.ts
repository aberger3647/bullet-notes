import { useEffect } from 'react';
import { findNodeById } from '../state/treeOps';
import type { BulletNode } from '../state/types';

export function useDocumentTitle(tree: BulletNode[], zoomPath: string[]) {
  useEffect(() => {
    if (zoomPath.length === 0) {
      document.title = 'Bullet notes';
      return;
    }
    const id = zoomPath[zoomPath.length - 1]!;
    const n = findNodeById(tree, id);
    const raw = (n?.text ?? '').trim() || 'Untitled';
    const max = 56;
    document.title = raw.length > max ? `${raw.slice(0, max)}…` : raw;
  }, [tree, zoomPath]);
}
