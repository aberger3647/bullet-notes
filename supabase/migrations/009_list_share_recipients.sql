-- Let a share's owner see who has opened it.
create or replace function bullet_notes_list_share_recipients(p_share_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_document_id
  from bullet_notes_documents
  where share_token = p_share_token and user_id = auth.uid();

  if v_document_id is null then
    raise exception 'Share not found or not owned by you';
  end if;

  return (
    select coalesce(jsonb_agg(row order by row.last_opened_at desc), '[]'::jsonb)
    from (
      select
        coalesce(u.raw_user_meta_data ->> 'full_name', u.email) as recipient_name,
        r.first_opened_at,
        r.last_opened_at
      from bullet_notes_document_recipients r
      left join auth.users u on u.id = r.recipient_id
      where r.document_id = v_document_id
    ) row
  );
end;
$$;

grant execute on function bullet_notes_list_share_recipients(uuid) to authenticated;
