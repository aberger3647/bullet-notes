-- Persisted "who last edited this shared list" attribution, so a collaborator
-- can tell the other person made changes even if they were never online at
-- the same time. Scoped to bullet_notes_documents (the only place multi-user
-- editing exists) and stamped inside the single save RPC both the owner and
-- any edit-permission collaborator already funnel through.
alter table bullet_notes_documents
  add column last_edited_by uuid references auth.users(id) on delete set null;

create or replace function bullet_notes_save_document(p_share_token uuid, p_tree jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update bullet_notes_documents
  set tree = p_tree, updated_at = now(), last_edited_by = auth.uid()
  where share_token = p_share_token and not revoked and permission = 'edit';

  if not found then
    raise exception 'This document is view-only or no longer shared';
  end if;
end;
$$;

create or replace function bullet_notes_get_document(p_share_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return (
    select to_jsonb(d) || jsonb_build_object(
      'last_edited_by_name', coalesce(u.raw_user_meta_data ->> 'full_name', u.email)
    )
    from bullet_notes_documents d
    left join auth.users u on u.id = d.last_edited_by
    where d.share_token = p_share_token and not d.revoked
  );
end;
$$;

-- Metadata-only read for the document owner's local view, which already has the
-- full tree from its own state and only needs to know who last touched the
-- shared copy — avoids re-fetching/re-hydrating the whole subtree redundantly.
create or replace function bullet_notes_get_document_meta(p_share_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return (
    select jsonb_build_object(
      'last_edited_by', d.last_edited_by,
      'last_edited_by_name', coalesce(u.raw_user_meta_data ->> 'full_name', u.email),
      'updated_at', d.updated_at
    )
    from bullet_notes_documents d
    left join auth.users u on u.id = d.last_edited_by
    where d.share_token = p_share_token and not d.revoked
  );
end;
$$;

grant execute on function bullet_notes_get_document_meta(uuid) to authenticated;
revoke execute on function bullet_notes_get_document_meta(uuid) from public;
revoke execute on function bullet_notes_get_document_meta(uuid) from anon;
