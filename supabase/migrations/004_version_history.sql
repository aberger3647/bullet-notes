-- Daily version-history snapshots for the primary (local) document. Purely
-- additive — does not alter bullet_notes_user_documents. Snapshots are taken
-- client-side at most once per day and capped at 30 per user server-side.
create table bullet_notes_user_document_snapshots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  tree        jsonb not null,
  zoom_path   jsonb not null default '[]'::jsonb,
  settings    jsonb not null default '{"hideCompleted":false,"theme":"light"}'::jsonb,
  created_at  timestamptz not null default now()
);

create index bullet_notes_user_document_snapshots_user_id_idx
  on bullet_notes_user_document_snapshots (user_id, created_at desc);

alter table bullet_notes_user_document_snapshots enable row level security;

create policy "bullet_notes_deny direct snapshot access"
  on bullet_notes_user_document_snapshots
  for all
  using (false);

create or replace function bullet_notes_snapshot_user_document()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into bullet_notes_user_document_snapshots (user_id, tree, zoom_path, settings)
  select user_id, tree, zoom_path, settings
  from bullet_notes_user_documents
  where user_id = auth.uid();

  delete from bullet_notes_user_document_snapshots
  where user_id = auth.uid()
    and id not in (
      select id from bullet_notes_user_document_snapshots
      where user_id = auth.uid()
      order by created_at desc
      limit 30
    );
end;
$$;

create or replace function bullet_notes_list_snapshots()
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
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'created_at', created_at) order by created_at desc), '[]'::jsonb)
    from bullet_notes_user_document_snapshots
    where user_id = auth.uid()
  );
end;
$$;

create or replace function bullet_notes_restore_snapshot(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update bullet_notes_user_documents d
  set tree = s.tree,
      zoom_path = s.zoom_path,
      settings = s.settings,
      updated_at = now()
  from bullet_notes_user_document_snapshots s
  where s.id = p_id
    and s.user_id = auth.uid()
    and d.user_id = auth.uid()
  returning to_jsonb(d) into v_result;

  return v_result;
end;
$$;

grant execute on function bullet_notes_snapshot_user_document() to authenticated;
grant execute on function bullet_notes_list_snapshots() to authenticated;
grant execute on function bullet_notes_restore_snapshot(uuid) to authenticated;
