-- 011 revoked EXECUTE from PUBLIC, but Supabase's default per-role ACLs grant
-- EXECUTE directly to anon (not via PUBLIC), so that revoke was a no-op for
-- every function except the ones migration 002 already explicitly revoked
-- from anon. Close the rest here (redundant for the 3 already-closed ones,
-- which is harmless).

revoke execute on function bullet_notes_create_doc(text, jsonb, jsonb, jsonb) from anon;
revoke execute on function bullet_notes_create_document(jsonb) from anon;
revoke execute on function bullet_notes_delete_doc(uuid) from anon;
revoke execute on function bullet_notes_delete_my_data() from anon;
revoke execute on function bullet_notes_get_doc(uuid) from anon;
revoke execute on function bullet_notes_get_document(uuid) from anon;
revoke execute on function bullet_notes_list_docs() from anon;
revoke execute on function bullet_notes_list_my_shares(int, int) from anon;
revoke execute on function bullet_notes_list_share_recipients(uuid) from anon;
revoke execute on function bullet_notes_list_shared_with_me(int, int) from anon;
revoke execute on function bullet_notes_list_snapshots() from anon;
revoke execute on function bullet_notes_record_share_open(uuid) from anon;
revoke execute on function bullet_notes_restore_snapshot(uuid) from anon;
revoke execute on function bullet_notes_revoke_share(uuid) from anon;
revoke execute on function bullet_notes_save_doc(uuid, text, jsonb, jsonb, jsonb) from anon;
revoke execute on function bullet_notes_save_document(uuid, jsonb) from anon;
revoke execute on function bullet_notes_set_share_permission(uuid, text) from anon;
revoke execute on function bullet_notes_snapshot_user_document() from anon;
