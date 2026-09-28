-- Real user accounts, platform roles, and per-project membership.
-- Replaces the free-text `projects.users` placeholder that stood in for
-- access control before Supabase Auth was wired up (see
-- docs/decisions/0003-no-auth-in-prototype.md, now superseded).
--
-- Access is invite-only: there is no public sign-up (disabled in the
-- Supabase dashboard, not in SQL), so every row in `profiles` was created
-- either by an admin's invite or by the trigger below.
--
-- Like every other table in this schema, these stay service_role-only (no
-- RLS policies for anon/authenticated). Who-can-see-what is enforced in
-- Next.js server code (src/lib/auth/session.ts), which already sits in
-- front of 100% of the app's Supabase access — see the ADR for this
-- decision.

-- `profiles` mirrors auth.users 1:1. auth.users itself is Supabase-managed
-- and lives outside the `ampersand` schema.
create table ampersand.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table ampersand.profiles enable row level security;

-- Auto-creates a profile row whenever Supabase Auth creates a user (i.e. an
-- admin's invite). security definer so it can write into `ampersand` even
-- though the triggering insert happens against `auth.users`.
create function ampersand.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ampersand, public
as $$
begin
  insert into ampersand.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function ampersand.handle_new_user();

-- Per-project membership: 'editor' (full content/form powers within the
-- project) or 'user' (read-only browse/search + Create). Platform admins
-- don't need a row here — profiles.is_admin already grants full access to
-- every project, per AGENTS.md's admin model.
create table ampersand.project_members (
  project_id uuid not null references ampersand.projects(id) on delete cascade,
  user_id uuid not null references ampersand.profiles(id) on delete cascade,
  role text not null check (role in ('editor', 'user')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

alter table ampersand.project_members enable row level security;

-- Superseded by project_members.
alter table ampersand.projects drop column users;
