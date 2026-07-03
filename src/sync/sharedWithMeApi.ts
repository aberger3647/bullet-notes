import { supabase } from '../lib/supabase';

export type SharedWithMeItem = {
  share_token: string;
  permission: 'edit' | 'view';
  revoked: boolean;
  updated_at: string;
  last_opened_at: string;
  owner_name: string | null;
};

export const SHARED_WITH_ME_PAGE_SIZE = 20;

export async function recordShareOpen(shareToken: string): Promise<void> {
  const { error } = await supabase.rpc('bullet_notes_record_share_open', { p_share_token: shareToken });
  if (error) throw error;
}

export async function listSharedWithMe(
  offset = 0,
  limit = SHARED_WITH_ME_PAGE_SIZE,
): Promise<{ items: SharedWithMeItem[]; hasMore: boolean }> {
  const { data, error } = await supabase.rpc('bullet_notes_list_shared_with_me', {
    p_limit: limit + 1,
    p_offset: offset,
  });
  if (error) throw error;
  const rows = (data as SharedWithMeItem[] | null) ?? [];
  const hasMore = rows.length > limit;
  return { items: hasMore ? rows.slice(0, limit) : rows, hasMore };
}
