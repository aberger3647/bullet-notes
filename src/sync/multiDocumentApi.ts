import { supabase } from '../lib/supabase';
import type { BulletNode, PersistedState } from '../state/types';

export type DocMeta = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type DocRow = DocMeta & {
  tree: BulletNode[];
  zoom_path: string[];
  settings: PersistedState['settings'];
};

export async function listDocs(): Promise<DocMeta[]> {
  const { data, error } = await supabase.rpc('bullet_notes_list_docs');
  if (error) throw error;
  return (data as DocMeta[] | null) ?? [];
}

export async function createDoc(title: string, payload: PersistedState): Promise<string> {
  const { data, error } = await supabase.rpc('bullet_notes_create_doc', {
    p_title: title,
    p_tree: payload.tree,
    p_zoom_path: payload.zoomPath,
    p_settings: payload.settings,
  });
  if (error) throw error;
  return data as string;
}

export async function getDoc(id: string): Promise<DocRow | null> {
  const { data, error } = await supabase.rpc('bullet_notes_get_doc', { p_id: id });
  if (error) throw error;
  if (!data) return null;
  return data as DocRow;
}

export async function saveDoc(id: string, title: string, payload: PersistedState): Promise<void> {
  const { error } = await supabase.rpc('bullet_notes_save_doc', {
    p_id: id,
    p_title: title,
    p_tree: payload.tree,
    p_zoom_path: payload.zoomPath,
    p_settings: payload.settings,
  });
  if (error) throw error;
}

export async function deleteDoc(id: string): Promise<void> {
  const { error } = await supabase.rpc('bullet_notes_delete_doc', { p_id: id });
  if (error) throw error;
}
