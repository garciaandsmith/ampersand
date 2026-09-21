-- Models an admin has picked from a provider's live model list (Settings →
-- "Available models") so they show up in the provider/model dropdowns next to
-- the hand-maintained catalog in src/lib/ai/models.ts. Removing a provider
-- removes its picks.

create table ampersand.ai_enabled_models (
  provider_id uuid not null references ampersand.ai_providers(id) on delete cascade,
  model text not null,
  created_at timestamptz not null default now(),
  primary key (provider_id, model)
);

alter table ampersand.ai_enabled_models enable row level security;
