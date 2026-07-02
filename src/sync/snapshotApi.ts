import { supabase } from '../lib/supabase';
import type { BulletNode, Settings } from '../state/types';

export type SnapshotMeta = { id: string; created_at: string };

export type RestoredDocument = {
  tree: BulletNode[];
  zoom_path: string[];
  settings: Settings;
};

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
