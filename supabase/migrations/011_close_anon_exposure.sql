-- Access to these tables/functions is only ever through the security-definer
-- RPCs below (never direct table queries from the client, and every function
-- checks auth.uid() internally). Revoking the default anon/authenticated
-- table grants and the PUBLIC execute grant on these functions closes their
-- PostgREST/GraphQL introspection exposure without changing app behavior,
-- since security-definer functions run with their owner's privileges
-- regardless of the caller's own grants.

revoke all on table bullet_notes_docs from anon, authenticated;
revoke all on table bullet_notes_document_recipients from anon, authenticated;
revoke all on table bullet_notes_documents from anon, authenticated;
revoke all on table bullet_notes_user_document_snapshots from anon, authenticated;

revoke execute on function bullet_notes_create_doc(text, jsonb, jsonb, jsonb) from public;
revoke execute on function bullet_notes_create_document(jsonb) from public;
revoke execute on function bullet_notes_delete_doc(uuid) from public;
revoke execute on function bullet_notes_delete_my_data() from public;
revoke execute on function bullet_notes_get_doc(uuid) from public;
revoke execute on function bullet_notes_get_document(uuid) from public;
revoke execute on function bullet_notes_list_docs() from public;
revoke execute on function bullet_notes_list_my_shares(int, int) from public;
revoke execute on function bullet_notes_list_share_recipients(uuid) from public;
revoke execute on function bullet_notes_list_shared_with_me(int, int) from public;
revoke execute on function bullet_notes_list_snapshots() from public;
revoke execute on function bullet_notes_record_share_open(uuid) from public;
revoke execute on function bullet_notes_restore_snapshot(uuid) from public;
revoke execute on function bullet_notes_revoke_share(uuid) from public;
revoke execute on function bullet_notes_save_doc(uuid, text, jsonb, jsonb, jsonb) from public;
revoke execute on function bullet_notes_save_document(uuid, jsonb) from public;
revoke execute on function bullet_notes_set_share_permission(uuid, text) from public;
revoke execute on function bullet_notes_snapshot_user_document() from public;
