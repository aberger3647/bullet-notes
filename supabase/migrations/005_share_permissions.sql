-- View-only share links + share management/revoke. Additive columns with
-- backward-compatible defaults: existing shares keep working exactly as
-- before (permission='edit', revoked=false, user_id=null so they simply
-- won't show up in "my shared links" until re-shared).
alter table bullet_notes_documents
  add column user_id uuid references auth.users(id) on delete set null,
  add column permission text not null default 'edit' check (permission in ('edit', 'view')),
  add column revoked boolean not null default false;

create index bullet_notes_documents_user_id_idx on bullet_notes_documents (user_id);

create or replace function bullet_notes_create_document(p_tree jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into bullet_notes_documents (tree, user_id) values (p_tree, auth.uid())
  returning share_token into v_token;
  return v_token;
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
    select to_jsonb(d)
    from bullet_notes_documents d
    where share_token = p_share_token and not revoked
  );
end;
$$;

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
  set tree = p_tree, updated_at = now()
  where share_token = p_share_token and not revoked and permission = 'edit';

  if not found then
    raise exception 'This document is view-only or no longer shared';
  end if;
end;
$$;

create or replace function bullet_notes_list_my_shares()
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
    select coalesce(jsonb_agg(to_jsonb(d) - 'tree' order by d.updated_at desc), '[]'::jsonb)
    from bullet_notes_documents d
    where user_id = auth.uid()
  );
end;
$$;

create or replace function bullet_notes_set_share_permission(p_share_token uuid, p_permission text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_permission not in ('edit', 'view') then
    raise exception 'Invalid permission';
  end if;

  update bullet_notes_documents
  set permission = p_permission
  where share_token = p_share_token and user_id = auth.uid();

  if not found then
    raise exception 'Share not found or not owned by you';
  end if;
end;
$$;

create or replace function bullet_notes_revoke_share(p_share_token uuid)
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
  set revoked = true
  where share_token = p_share_token and user_id = auth.uid();

  if not found then
    raise exception 'Share not found or not owned by you';
  end if;
end;
$$;

grant execute on function bullet_notes_list_my_shares() to authenticated;
grant execute on function bullet_notes_set_share_permission(uuid, text) to authenticated;
grant execute on function bullet_notes_revoke_share(uuid) to authenticated;
