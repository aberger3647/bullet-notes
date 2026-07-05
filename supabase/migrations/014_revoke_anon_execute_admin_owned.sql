-- Same as 013, plus the table grant on bullet_notes_schema_migrations that
-- was missed in 010 (010 only enabled RLS on it, never revoked the
-- anon/authenticated table grant). All objects here are owned by
-- supabase_admin (requires SUPABASE_DB_USER=supabase_admin npm run db:migrate).

revoke all on table bullet_notes_schema_migrations from anon, authenticated;

revoke execute on function bullet_notes_get_user_document() from anon;
revoke execute on function bullet_notes_save_user_document(jsonb, jsonb, jsonb) from anon;
