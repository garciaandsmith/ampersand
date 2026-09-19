-- Replace the fixed 6-skill "ai_skill_assignments" table (whose skill_key
-- was a hardcoded set of product operations, each implying its own field
-- requirements and generation behavior) with a freeform, admin-managed
-- "ai_skills" table: just a named shortcut for a provider+model pair that
-- the Form Builder's skill picker selects from. A skill no longer implies
-- anything about the field it's attached to (required source field, required
-- prompt, allowed source field types) — that's on whoever writes the
-- field's prompt now.
--
-- The Create chat assistant isn't a form-builder concept, so it's decoupled
-- from "skills" entirely and gets its own single settings row instead.

create table ampersand.ai_skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider_id uuid references ampersand.ai_providers(id) on delete set null,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table ampersand.ai_skills enable row level security;

-- Seed skills from the old fixed assignments, carrying over any configured
-- provider/model. Fixed ids so form_fields.skill_key can be backfilled to
-- the matching skill_id below.
insert into ampersand.ai_skills (id, name, provider_id, model)
select
  case a.skill_key
    when 'field_automation' then 'a0000000-0000-0000-0000-000000000001'::uuid
    when 'summary_generation' then 'a0000000-0000-0000-0000-000000000002'::uuid
    when 'image_recognition' then 'a0000000-0000-0000-0000-000000000003'::uuid
    when 'document_parsing' then 'a0000000-0000-0000-0000-000000000004'::uuid
    when 'image_generation' then 'a0000000-0000-0000-0000-000000000005'::uuid
  end,
  case a.skill_key
    when 'field_automation' then 'Automated form fields'
    when 'summary_generation' then 'Summary generation'
    when 'image_recognition' then 'Image recognition'
    when 'document_parsing' then 'Document parsing'
    when 'image_generation' then 'Image generation'
  end,
  a.provider_id,
  a.model
from ampersand.ai_skill_assignments a
where a.skill_key <> 'text_generation';

-- Create's chat assistant: one settings row, unrelated to the skills list.
create table ampersand.chat_settings (
  id boolean primary key default true check (id),
  provider_id uuid references ampersand.ai_providers(id) on delete set null,
  model text,
  updated_at timestamptz not null default now()
);

alter table ampersand.chat_settings enable row level security;

insert into ampersand.chat_settings (id, provider_id, model)
select true, a.provider_id, a.model
from ampersand.ai_skill_assignments a
where a.skill_key = 'text_generation'
on conflict (id) do nothing;

-- form_fields: replace the fixed skill_key text column with a real FK to
-- the new skills list, and drop the never-wired per-field override columns
-- (nothing ever wrote to them — see 0005's comment).
alter table ampersand.form_fields
  add column if not exists skill_id uuid references ampersand.ai_skills(id) on delete set null;

update ampersand.form_fields f
set skill_id = case f.skill_key
  when 'field_automation' then 'a0000000-0000-0000-0000-000000000001'::uuid
  when 'summary_generation' then 'a0000000-0000-0000-0000-000000000002'::uuid
  when 'image_recognition' then 'a0000000-0000-0000-0000-000000000003'::uuid
  when 'document_parsing' then 'a0000000-0000-0000-0000-000000000004'::uuid
  when 'image_generation' then 'a0000000-0000-0000-0000-000000000005'::uuid
end
where f.skill_key is not null;

alter table ampersand.form_fields
  drop column if exists skill_key,
  drop column if exists automation_provider_override_id,
  drop column if exists automation_model_override;

drop table if exists ampersand.ai_skill_assignments;
