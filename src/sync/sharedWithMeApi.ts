import { supabase } from '../lib/supabase';
import type { Tables } from '../database-generated.types';

export type SharedWithMeItem = Pick<
  Tables<'bullet_notes_documents'>,
  'share_token' | 'revoked' | 'updated_at'
> & {
  permission: 'edit' | 'view';
  last_opened_at: Tables<'bullet_notes_document_recipients'>['last_opened_at'];
  owner_name: string | null;
};

export const SHARED_WITH_ME_PAGE_SIZE = 20;

export function isNewActivity(item: SharedWithMeItem): boolean {
  return new Date(item.updated_at).getTime() > new Date(item.last_opened_at).getTime();
}

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
