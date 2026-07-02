-- Multiple documents per account. Purely additive: does not touch
-- bullet_notes_user_documents (the existing single "primary" document), so the
-- existing local (/) experience is completely unaffected. Users opt in by
-- explicitly saving their primary document as their first entry here.
create table bullet_notes_docs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default 'Untitled',
  tree        jsonb not null default '[]'::jsonb,
  zoom_path   jsonb not null default '[]'::jsonb,
  settings    jsonb not null default '{"hideCompleted":false,"theme":"light"}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index bullet_notes_docs_user_id_idx on bullet_notes_docs (user_id, updated_at desc);

alter table bullet_notes_docs enable row level security;

create policy "bullet_notes_deny direct docs access"
  on bullet_notes_docs
  for all
  using (false);

create or replace function bullet_notes_list_docs()
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
    from bullet_notes_docs d
    where user_id = auth.uid()
  );
end;
$$;

create or replace function bullet_notes_create_doc(p_title text, p_tree jsonb, p_zoom_path jsonb, p_settings jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into bullet_notes_docs (user_id, title, tree, zoom_path, settings)
  values (auth.uid(), coalesce(nullif(p_title, ''), 'Untitled'), p_tree, p_zoom_path, p_settings)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function bullet_notes_get_doc(p_id uuid)
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
    from bullet_notes_docs d
    where id = p_id and user_id = auth.uid()
  );
end;
$$;

create or replace function bullet_notes_save_doc(p_id uuid, p_title text, p_tree jsonb, p_zoom_path jsonb, p_settings jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update bullet_notes_docs
  set title = coalesce(nullif(p_title, ''), 'Untitled'),
      tree = p_tree,
      zoom_path = p_zoom_path,
      settings = p_settings,
      updated_at = now()
  where id = p_id and user_id = auth.uid();
end;
$$;

create or replace function bullet_notes_delete_doc(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from bullet_notes_docs where id = p_id and user_id = auth.uid();
end;
$$;

grant execute on function bullet_notes_list_docs() to authenticated;
grant execute on function bullet_notes_create_doc(text, jsonb, jsonb, jsonb) to authenticated;
grant execute on function bullet_notes_get_doc(uuid) to authenticated;
grant execute on function bullet_notes_save_doc(uuid, text, jsonb, jsonb, jsonb) to authenticated;
grant execute on function bullet_notes_delete_doc(uuid) to authenticated;
