import { supabase } from '../lib/supabase';

export type ShareMeta = {
  id: string;
  share_token: string;
  updated_at: string;
  permission: 'edit' | 'view';
  revoked: boolean;
};

export async function listMyShares(): Promise<ShareMeta[]> {
  const { data, error } = await supabase.rpc('bullet_notes_list_my_shares');
  if (error) throw error;
  return (data as ShareMeta[] | null) ?? [];
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
