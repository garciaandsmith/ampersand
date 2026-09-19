# ADR 0006 — Skills carry model-aware tuning parameters (effort, token limit)

## Status
Accepted

## Context
A skill was only a provider + model pair, and every call was hard-capped at
1024 output tokens. Admins wanted to tune skills further, but the parameters
providers accept differ by provider and by model, and change with model
generations: temperature/top_p/top_k are rejected by the newest Anthropic
models, effort levels exist on some models and not others, and OpenAI names
its token limit and reasoning dial differently.

## Decision
- A skill's recipe is provider + model + **effort** + **max output tokens**
  (both optional; null = the model's default). Stored as `ai_skills.effort`
  and `ai_skills.max_output_tokens`.
- The two settings are provider-neutral. `generateText()`
  (`src/lib/ai/client.ts`) translates them: Anthropic `max_tokens` /
  `output_config.effort`, OpenAI `max_completion_tokens` / `reasoning_effort`.
- `MODEL_CATALOG` (`src/lib/ai/models.ts`) records, per model, which effort
  levels it accepts and the highest token limit an admin can set. The admin
  form renders only what the selected model supports.
- `normalizeParams()` runs both when saving and when calling the provider:
  unsupported effort is dropped and token limits are clamped, so a stale
  setting never turns into an API error.
- Temperature and other sampling parameters are deliberately not exposed.

## Rationale
Effort and output length are the two settings that visibly change results and
that most current models accept. Keeping them provider-neutral means adding a
provider only needs a new translation branch in `generateText()`. Dropping
unsupported values (rather than erroring) keeps skills working when an admin
swaps the model or a provider changes what it accepts.

## Consequences
- The catalog must be kept current when models ship or retire; models not in
  it get no effort setting and a default token limit.
- The token ceiling in the catalog (16,000) is a practical limit for
  non-streaming calls, not the models' absolute output maximum. Raising it
  requires streaming responses.
- OpenAI effort levels in the catalog are a conservative guess and should be
  checked against OpenAI's documentation per model.
- When a token limit is left blank the default is 4,096 (previously 1,024),
  for every caller of `generateText()`, including the Create chat.
- The Create chat assistant does not have these settings yet; a future
  "Create setups" feature can reuse the catalog, `normalizeParams()` and the
  form fields.

## Alternatives considered
- **Expose temperature/top_p too:** rejected — most models in the catalog
  reject them, so the field would be dead or cause errors.
- **A JSON `params` column for arbitrary settings:** deferred — two explicit
  columns are easier to validate now; can be revisited when more knobs exist.
- **Erroring on unsupported settings:** rejected in favor of silently
  dropping, because admins can change models independently of saved settings.
