alter table bullet_notes_schema_migrations enable row level security;

create policy "bullet_notes_deny direct access"
  on bullet_notes_schema_migrations
  for all
  using (false);
