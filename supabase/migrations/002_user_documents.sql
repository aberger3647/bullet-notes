-- Personal documents per authenticated user
create table bullet_notes_user_documents (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  tree        jsonb not null default '[]'::jsonb,
  zoom_path   jsonb not null default '[]'::jsonb,
  settings    jsonb not null default '{"hideCompleted":false,"theme":"light"}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table bullet_notes_user_documents enable row level security;

create policy "bullet_notes_deny direct user doc access"
  on bullet_notes_user_documents
  for all
  using (false);

create or replace function bullet_notes_get_user_document()
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
    from bullet_notes_user_documents d
    where user_id = auth.uid()
  );
end;
$$;

create or replace function bullet_notes_save_user_document(
  p_tree jsonb,
  p_zoom_path jsonb,
  p_settings jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into bullet_notes_user_documents (user_id, tree, zoom_path, settings, updated_at)
  values (auth.uid(), p_tree, p_zoom_path, p_settings, now())
  on conflict (user_id) do update
  set tree = excluded.tree,
      zoom_path = excluded.zoom_path,
      settings = excluded.settings,
      updated_at = now();
end;
$$;

grant execute on function bullet_notes_get_user_document() to authenticated;
grant execute on function bullet_notes_save_user_document(jsonb, jsonb, jsonb) to authenticated;

-- Require authentication for shared document RPCs
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

  insert into bullet_notes_documents (tree) values (p_tree)
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
    where share_token = p_share_token
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
  where share_token = p_share_token;
end;
$$;

revoke execute on function bullet_notes_create_document(jsonb) from anon;
revoke execute on function bullet_notes_get_document(uuid) from anon;
revoke execute on function bullet_notes_save_document(uuid, jsonb) from anon;

grant execute on function bullet_notes_create_document(jsonb) to authenticated;
grant execute on function bullet_notes_get_document(uuid) to authenticated;
grant execute on function bullet_notes_save_document(uuid, jsonb) to authenticated;
