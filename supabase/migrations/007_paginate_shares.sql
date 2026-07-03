-- Paginate "my shared links" so accounts with many shares don't fetch them
-- all in one request.
drop function if exists bullet_notes_list_my_shares();

create or replace function bullet_notes_list_my_shares(p_limit int default 20, p_offset int default 0)
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
    select coalesce(jsonb_agg(to_jsonb(d) - 'tree' order by d.updated_at desc), '[]'::jsonb)
    from (
      select *
      from bullet_notes_documents
      where user_id = auth.uid()
      order by updated_at desc
      limit p_limit
      offset p_offset
    ) d
  );
end;
$$;

grant execute on function bullet_notes_list_my_shares(int, int) to authenticated;
