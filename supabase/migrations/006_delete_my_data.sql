-- Lets a signed-in user permanently delete all of *their* Bullet Notes data
-- (primary document, extra documents, snapshots, and shares they created).
-- Deliberately does NOT delete the auth.users row itself — removing the login
-- account requires the Supabase Admin API (service-role key), which isn't
-- something a client-side RPC can safely do. The client signs the user out
-- after this succeeds; their Google/auth account itself is untouched.
create or replace function bullet_notes_delete_my_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from bullet_notes_user_documents where user_id = auth.uid();
  delete from bullet_notes_docs where user_id = auth.uid();
  delete from bullet_notes_user_document_snapshots where user_id = auth.uid();
  delete from bullet_notes_documents where user_id = auth.uid();
end;
$$;

grant execute on function bullet_notes_delete_my_data() to authenticated;
