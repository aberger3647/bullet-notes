import { supabase } from '../lib/supabase';
import { collectSharedRoots, findNodeById } from '../state/treeOps';
import type { BulletNode } from '../state/types';

export type ShareMeta = {
  id: string;
  share_token: string;
  updated_at: string;
  permission: 'edit' | 'view';
  revoked: boolean;
};

export const SHARES_PAGE_SIZE = 20;

export async function listMyShares(
  offset = 0,
  limit = SHARES_PAGE_SIZE,
): Promise<{ shares: ShareMeta[]; hasMore: boolean }> {
  const { data, error } = await supabase.rpc('bullet_notes_list_my_shares', {
    p_limit: limit + 1,
    p_offset: offset,
  });
  if (error) throw error;
  const rows = (data as ShareMeta[] | null) ?? [];
  const hasMore = rows.length > limit;
  return { shares: hasMore ? rows.slice(0, limit) : rows, hasMore };
}

export async function setSharePermission(shareToken: string, permission: 'edit' | 'view'): Promise<void> {
  const { error } = await supabase.rpc('bullet_notes_set_share_permission', {
    p_share_token: shareToken,
    p_permission: permission,
  });
  if (error) throw error;
}

export async function revokeShare(shareToken: string): Promise<void> {
  const { error } = await supabase.rpc('bullet_notes_revoke_share', { p_share_token: shareToken });
  if (error) throw error;
}

/** All share tokens the current user has revoked (fetches every page). */
export async function listRevokedShareTokens(): Promise<Set<string>> {
  const revoked = new Set<string>();
  let offset = 0;
  for (;;) {
    const { shares, hasMore } = await listMyShares(offset, SHARES_PAGE_SIZE);
    for (const share of shares) {
      if (share.revoked) revoked.add(share.share_token);
    }
    if (!hasMore) break;
    offset += SHARES_PAGE_SIZE;
  }
  return revoked;
}

/** Best-effort revoke of any share links owned by `id` or its descendants — call before deleting a bullet. */
export function revokeSharesInSubtree(tree: BulletNode[], id: string): void {
  const node = findNodeById(tree, id);
  if (!node) return;
  for (const { shareToken } of collectSharedRoots([node])) {
    void revokeShare(shareToken).catch(() => {});
  }
}
