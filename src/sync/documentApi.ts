import { supabase } from '../lib/supabase';
import type { Tables } from '../database-generated.types';
import type { BulletNode } from '../state/types';
import type { BroadcastMessage } from './syncTypes';

export type DocumentRow = Omit<Tables<'bullet_notes_documents'>, 'tree' | 'permission'> & {
  tree: BulletNode[];
  permission: 'edit' | 'view';
};

export function parseBroadcastMessage(raw: unknown): BroadcastMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const envelope = raw as Record<string, unknown>;
  const inner =
    envelope.payload && typeof envelope.payload === 'object'
      ? (envelope.payload as BroadcastMessage)
      : (envelope as unknown as BroadcastMessage);
  if (!inner?.action || typeof inner.source !== 'string') return null;
  return inner;
}

export async function createSharedDocument(tree: BulletNode[]): Promise<string> {
  const { data, error } = await supabase.rpc('bullet_notes_create_document', { p_tree: tree });
  if (error) throw error;
  return data;
}

export async function fetchDocument(shareToken: string): Promise<DocumentRow | null> {
  const { data, error } = await supabase.rpc('bullet_notes_get_document', {
    p_share_token: shareToken,
  });
  if (error) throw error;
  if (!data) return null;
  return data as DocumentRow;
}

export async function persistDocument(shareToken: string, tree: BulletNode[]): Promise<void> {
  const { error } = await supabase.rpc('bullet_notes_save_document', {
    p_share_token: shareToken,
    p_tree: tree,
  });
  if (error) throw error;
}
