-- Let each automated field pick which AI skill governs its generation,
-- instead of every automated field implicitly using the single generic
-- field_automation skill.
--
-- Also adds per-field provider+model override columns. These are intended
-- to be settable only by "owners/admins" once this prototype has a role
-- concept — see docs/decisions/0003-no-auth-in-prototype.md, which already
-- establishes that this app has no auth/role system yet. The columns are
-- added now so the schema is ready; the UI/logic gating who can set them is
-- separate follow-up work.

alter table ampersand.form_fields
  add column if not exists skill_key text,
  add column if not exists automation_provider_override_id uuid references ampersand.ai_providers(id) on delete set null,
  add column if not exists automation_model_override text;

-- Backfill existing automated fields to the generic skill they implicitly
-- used before this column existed.
update ampersand.form_fields set skill_key = 'field_automation'
  where input_type = 'automated' and skill_key is null;
