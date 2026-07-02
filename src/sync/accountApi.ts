import { supabase } from '../lib/supabase';

export async function updateProfileName(fullName: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
  if (error) throw error;
}

export async function deleteMyData(): Promise<void> {
  const { error } = await supabase.rpc('bullet_notes_delete_my_data');
  if (error) throw error;
}
