import { supabase } from '../lib/supabase';
import type { Tables } from '../database-generated.types';
import type { UserDocumentRow } from './userDocumentApi';

export type SnapshotMeta = Pick<Tables<'bullet_notes_user_document_snapshots'>, 'id' | 'created_at'>;

export type RestoredDocument = Pick<UserDocumentRow, 'tree' | 'zoom_path' | 'settings'>;

export async function takeSnapshot(): Promise<void> {
  const { error } = await supabase.rpc('bullet_notes_snapshot_user_document');
  if (error) throw error;
}

export async function listSnapshots(): Promise<SnapshotMeta[]> {
  const { data, error } = await supabase.rpc('bullet_notes_list_snapshots');
  if (error) throw error;
  return (data as SnapshotMeta[] | null) ?? [];
}

export async function restoreSnapshot(id: string): Promise<RestoredDocument | null> {
  const { data, error } = await supabase.rpc('bullet_notes_restore_snapshot', { p_id: id });
  if (error) throw error;
  return (data as RestoredDocument | null) ?? null;
}
