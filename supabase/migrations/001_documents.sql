create table documents (
  id          uuid primary key default gen_random_uuid(),
  share_token uuid unique not null default gen_random_uuid(),
  tree        jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table documents enable row level security;

create policy "deny direct access"
  on documents
  for all
  using (false);

create or replace function create_document(p_tree jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid;
begin
  insert into documents (tree) values (p_tree)
  returning share_token into v_token;
  return v_token;
end;
$$;

create or replace function get_document(p_share_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return (
    select to_jsonb(d)
    from documents d
    where share_token = p_share_token
  );
end;
$$;

create or replace function save_document(p_share_token uuid, p_tree jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update documents
  set tree = p_tree, updated_at = now()
  where share_token = p_share_token;
end;
$$;

grant execute on function create_document(jsonb) to anon, authenticated;
grant execute on function get_document(uuid) to anon, authenticated;
grant execute on function save_document(uuid, jsonb) to anon, authenticated;
