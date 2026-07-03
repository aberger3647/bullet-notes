-- Track which users have opened a shared document, so they can find it again
-- under "Shared with me". Recording happens automatically the first time a
-- recipient opens a /d/:shareToken link (see bullet_notes_record_share_open).
create table bullet_notes_document_recipients (
  document_id     uuid not null references bullet_notes_documents(id) on delete cascade,
  recipient_id    uuid not null references auth.users(id) on delete cascade,
  first_opened_at timestamptz not null default now(),
  last_opened_at  timestamptz not null default now(),
  primary key (document_id, recipient_id)
);

create index bullet_notes_document_recipients_recipient_id_idx
  on bullet_notes_document_recipients (recipient_id);

alter table bullet_notes_document_recipients enable row level security;

create policy "bullet_notes_deny direct access"
  on bullet_notes_document_recipients
  for all
  using (false);

create or replace function bullet_notes_record_share_open(p_share_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document_id uuid;
  v_owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select id, user_id into v_document_id, v_owner_id
  from bullet_notes_documents
  where share_token = p_share_token and not revoked;

  if v_document_id is null then
    return;
  end if;

  -- Don't track the owner opening their own share link.
  if v_owner_id is not null and v_owner_id = auth.uid() then
    return;
  end if;

  insert into bullet_notes_document_recipients (document_id, recipient_id)
  values (v_document_id, auth.uid())
  on conflict (document_id, recipient_id)
  do update set last_opened_at = now();
end;
$$;

create or replace function bullet_notes_list_shared_with_me(p_limit int default 20, p_offset int default 0)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    p_limit := 20;
  end if;
  if p_offset is null or p_offset < 0 then
    p_offset := 0;
  end if;

  return (
    select coalesce(jsonb_agg(row order by row.last_opened_at desc), '[]'::jsonb)
    from (
      select
        d.share_token,
        d.permission,
        d.revoked,
        d.updated_at,
        r.last_opened_at,
        coalesce(u.raw_user_meta_data ->> 'full_name', u.email) as owner_name
      from bullet_notes_document_recipients r
      join bullet_notes_documents d on d.id = r.document_id
      left join auth.users u on u.id = d.user_id
      where r.recipient_id = auth.uid() and not d.revoked
      order by r.last_opened_at desc
      limit p_limit
      offset p_offset
    ) row
  );
end;
$$;

grant execute on function bullet_notes_record_share_open(uuid) to authenticated;
grant execute on function bullet_notes_list_shared_with_me(int, int) to authenticated;
