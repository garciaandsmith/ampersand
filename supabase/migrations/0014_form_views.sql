-- Form Views: editor-defined, mobile-first subsets of a project's manual
-- fields, for quick input on a phone. Filling one out creates a new archive
-- item scoped to just those fields (like the existing "New archive record"
-- flow, narrowed) rather than editing anything that already exists.

create table ampersand.form_views (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references ampersand.projects(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references ampersand.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table ampersand.form_views enable row level security;

-- Which fields appear on a Form View, and in what order. Deleting a field in
-- the Form Builder silently drops it from any Form View that included it.
create table ampersand.form_view_fields (
  form_view_id uuid not null references ampersand.form_views(id) on delete cascade,
  field_id uuid not null references ampersand.form_fields(id) on delete cascade,
  sort_order int not null default 0,
  primary key (form_view_id, field_id)
);

alter table ampersand.form_view_fields enable row level security;

-- Provenance log: which Form View created a given archive item, and by whom.
-- Deleting the Form View clears this log but leaves the archive item itself
-- untouched; deleting the archive item clears its log row.
create table ampersand.form_view_submissions (
  id uuid primary key default gen_random_uuid(),
  form_view_id uuid not null references ampersand.form_views(id) on delete cascade,
  archive_item_id uuid not null references ampersand.archive_items(id) on delete cascade,
  created_by uuid references ampersand.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table ampersand.form_view_submissions enable row level security;
