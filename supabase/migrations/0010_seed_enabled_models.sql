-- The dropdowns now show only the models an admin ticked (0009), instead of the
-- hard-coded catalog plus ticks. Tick what the dropdowns offered until now, so
-- nothing disappears: each provider's catalog models (mirroring MODEL_CATALOG in
-- src/lib/ai/models.ts), plus any model a skill or the chat assistant already uses.
-- Safe to re-run.

insert into ampersand.ai_enabled_models (provider_id, model)
select p.id, m.model
from ampersand.ai_providers p
join (values
  ('anthropic', 'claude-fable-5-1'),
  ('anthropic', 'claude-opus-5'),
  ('anthropic', 'claude-sonnet-5'),
  ('anthropic', 'claude-haiku-4-5'),
  ('openai', 'gpt-6-astra'),
  ('openai', 'gpt-5.6-sol'),
  ('openai', 'gpt-5.6-terra'),
  ('openai', 'gpt-5.6-luna'),
  ('openai', 'gpt-image-2.5-sunburst'),
  ('openai', 'gpt-image-2.5-flare')
) as m(type, model) on m.type = p.type
on conflict do nothing;

insert into ampersand.ai_enabled_models (provider_id, model)
select provider_id, model from ampersand.ai_skills
where provider_id is not null and model is not null
on conflict do nothing;

insert into ampersand.ai_enabled_models (provider_id, model)
select provider_id, model from ampersand.chat_settings
where provider_id is not null and model is not null
on conflict do nothing;
