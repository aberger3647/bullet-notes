import { supabase } from '../lib/supabase';
import type { Tables } from '../database-generated.types';
import type { BulletNode, PersistedState, Settings } from '../state/types';

export type UserDocumentRow = Omit<Tables<'bullet_notes_user_documents'>, 'tree' | 'zoom_path' | 'settings'> & {
  tree: BulletNode[];
  zoom_path: string[];
  settings: Settings;
};

export async function fetchUserDocument(): Promise<UserDocumentRow | null> {
  const { data, error } = await supabase.rpc('bullet_notes_get_user_document');
  if (error) throw error;
  if (!data) return null;
  return data as UserDocumentRow;
}

export async function persistUserDocument(payload: PersistedState): Promise<void> {
  const { error } = await supabase.rpc('bullet_notes_save_user_document', {
    p_tree: payload.tree,
    p_zoom_path: payload.zoomPath,
    p_settings: payload.settings,
  });
  if (error) throw error;
}
