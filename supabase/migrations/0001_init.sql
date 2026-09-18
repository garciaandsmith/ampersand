-- AMPERSAND prototype schema
-- Isolated in its own schema so it never collides with anything else in this Supabase project.
-- No RLS policies are defined for anon/authenticated roles: the prototype has no end-user auth
-- yet (see docs/decisions/0003-no-auth-in-prototype.md), so every table is reachable only via
-- the service_role key from server-side Next.js code. RLS is still enabled so a future anon/auth
-- policy has to be added deliberately rather than the tables being open by default.

create schema if not exists ampersand;

create extension if not exists pgcrypto;

-- Admin: Projects -----------------------------------------------------------

create table ampersand.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  users text, -- free-text placeholder until real user/auth management exists
  created_at timestamptz not null default now()
);

alter table ampersand.projects enable row level security;

-- Admin: AI Providers & Settings ---------------------------------------------

create table ampersand.ai_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('anthropic', 'openai')),
  api_key text not null,
  created_at timestamptz not null default now()
);

alter table ampersand.ai_providers enable row level security;

-- task_key identifies a place in the product that needs an AI call, e.g.
-- 'field_automation', 'chat', 'visual_recognition', 'summary_generation'.
create table ampersand.ai_task_assignments (
  task_key text primary key,
  provider_id uuid references ampersand.ai_providers(id) on delete set null,
  model text,
  updated_at timestamptz not null default now()
);

alter table ampersand.ai_task_assignments enable row level security;

-- Project: Form Builder -------------------------------------------------------

create table ampersand.form_fields (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references ampersand.projects(id) on delete cascade,
  name text not null,
  data_type text not null check (
    data_type in ('text', 'long_text', 'number', 'date', 'single_select', 'multi_select', 'tags', 'file', 'url')
  ),
  options jsonb, -- option list for single_select / multi_select
  input_type text not null check (input_type in ('manual', 'automated')),
  automation_source_field_id uuid references ampersand.form_fields(id) on delete set null,
  automation_prompt text,
  sort_order int not null default 0,
  is_core boolean not null default false, -- built-in fields (file upload, context, description)
  created_at timestamptz not null default now()
);

alter table ampersand.form_fields enable row level security;

-- Project: Archive -------------------------------------------------------------

create table ampersand.archive_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references ampersand.projects(id) on delete cascade,
  file_path text,
  file_name text,
  file_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table ampersand.archive_items enable row level security;

create table ampersand.archive_item_values (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references ampersand.archive_items(id) on delete cascade,
  field_id uuid not null references ampersand.form_fields(id) on delete cascade,
  value_text text,
  value_jsonb jsonb,
  unique (item_id, field_id)
);

alter table ampersand.archive_item_values enable row level security;

create index archive_item_values_text_search_idx
  on ampersand.archive_item_values using gin (to_tsvector('english', coalesce(value_text, '')));

-- Project: Create (chat) -------------------------------------------------------

create table ampersand.chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references ampersand.projects(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb,
  created_at timestamptz not null default now()
);

alter table ampersand.chat_messages enable row level security;

-- Seed default task assignments (no provider yet; configured in Admin > Settings)
insert into ampersand.ai_task_assignments (task_key, model) values
  ('field_automation', null),
  ('visual_recognition', null),
  ('summary_generation', null),
  ('chat', null)
on conflict (task_key) do nothing;
