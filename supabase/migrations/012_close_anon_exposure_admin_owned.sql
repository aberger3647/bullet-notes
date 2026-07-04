-- Same as 011, but for the handful of objects owned by supabase_admin
-- instead of postgres (requires SUPABASE_DB_USER=supabase_admin npm run db:migrate).

revoke all on table bullet_notes_user_documents from anon, authenticated;

revoke execute on function bullet_notes_get_user_document() from public;
revoke execute on function bullet_notes_save_user_document(jsonb, jsonb, jsonb) from public;
