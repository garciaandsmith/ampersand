# AMPERSAND — architecture overview

Status as of this prototype build. See `docs/decisions/` for the reasoning
behind each choice referenced here.

## Stack

- **Framework**: Next.js (App Router, TypeScript, Tailwind CSS v4). See
  [ADR 0001](../decisions/0001-web-framework.md).
- **Backend**: Supabase Postgres, in a dedicated `ampersand` schema, accessed
  only via the service-role key from server-side code. See
  [ADR 0002](../decisions/0002-supabase-schema-isolation.md).
- **Storage**: a private Supabase Storage bucket, `archive`, for uploaded
  Archive files. Files are served via short-lived signed URLs
  (`getArchiveFileSignedUrl`), never made public.
- **AI**: Anthropic and OpenAI SDKs behind one provider-agnostic interface,
  configured at runtime from the Admin UI. See
  [ADR 0004](../decisions/0004-pluggable-ai-providers.md).
- **Auth**: none yet. See
  [ADR 0003](../decisions/0003-no-auth-in-prototype.md) — **do not deploy
  this publicly without adding auth first.**

## Directory map

```
src/
  app/
    admin/                     Admin shell: Projects, Settings
      projects/                Project list + create
      settings/                AI Providers + Task assignments
    projects/[projectId]/      Project shell: Archive, Form Builder, Create
      archive/                 Record table, detail/edit, new-record flow
      form-builder/            Per-project field schema editor
      create/                  RAG-grounded chat
  components/                  Shared UI (Shell, NavLinks, ui.tsx primitives)
  lib/
    supabase/server.ts         Service-role Supabase client (server-only)
    data/                      Typed CRUD per entity (projects, providers,
                                fields, archive, chat)
    ai/
      client.ts                Vendor-agnostic generateText() (Anthropic/OpenAI)
      tasks.ts                 Product-level AI operations (field automation,
                                visual recognition, chat answering)
    types.ts                   Shared domain types
supabase/migrations/           Hand-applied SQL (no migration runner yet —
                                see "Database" below)
```

## Data model

All tables live in the `ampersand` Postgres schema:

- **`projects`** — one row per client/project. `users` is currently
  free-text (no real user system — see ADR 0003).
- **`ai_providers`** — named connections (`type`: anthropic | openai,
  `api_key`) entered via Admin → Settings.
- **`ai_task_assignments`** — maps a fixed task key
  (`field_automation` | `visual_recognition` | `summary_generation` | `chat`)
  to a provider + model string.
- **`form_fields`** — per-project field schema (the Form Builder's output).
  A field is either `manual` or `automated`; automated fields reference a
  source field (`automation_source_field_id`) and a `automation_prompt`
  written by the user. Two core fields (`Context`, `Content description`)
  are created automatically for every new project.
- **`archive_items`** — one row per ingested asset. Holds the uploaded
  file's storage path/name/type; all other data lives in
  `archive_item_values`.
- **`archive_item_values`** — EAV-style value store: one row per
  `(archive_item, form_field)` pair, holding either `value_text` or
  `value_jsonb` (for multi-value types like tags). Indexed with a GIN
  `tsvector` index for the Create chat's retrieval.
- **`chat_messages`** — Create's conversation history per project, including
  the source snippets an assistant answer was grounded in.

## Database migrations

There is no migration runner wired up yet (no Supabase CLI link, no CI step).
SQL files in `supabase/migrations/` are applied by hand via the Supabase SQL
Editor — see each file's contents for what it does. `0001_init.sql` creates
the schema and tables; `0002_grants.sql` grants the `service_role` access
Supabase doesn't provide automatically outside `public`. Future schema
changes should be added as new numbered files here even without an automated
runner, so the SQL history stays legible.

## Skills

A "skill" (`ampersand.ai_skills`, `src/lib/data/providers.ts`) is an
admin-managed, freeform name attached to a "recipe": a provider + model, plus
an optional effort level and output-token limit (`effort`,
`max_output_tokens`; null = the model's default). Admins create/rename/delete
skills and set the recipe in Admin → Settings; the Form Builder's skill
picker just selects one by name for an automated field
(`form_fields.skill_id`). Picking a skill carries no other implication — it
doesn't require a source field, a prompt, or any particular source field
type. That used to be true (a fixed six-skill enum where e.g.
`image_recognition` required a file-type source field); it was deliberately
simplified away to avoid clutter.

Which effort levels and token ceiling a model accepts lives in
`MODEL_CATALOG` (`src/lib/ai/models.ts`); the admin form only offers what the
chosen model supports, and `generateText()` drops anything unsupported before
calling the provider. See [ADR 0006](../decisions/0006-skill-recipe-parameters.md).

## Automated fields

An automated field is self-describing: a **source** (optional field whose
content is read — text, an image or a PDF, decided by the source field's
data type and the file's MIME type), a **prompt** (the instruction), a
**data type** (+ options for lists) that defines the output format, and a
**skill** that picks the provider/model. `generateAutomatedFieldsAction`
(`src/app/projects/[projectId]/archive/new/actions.ts`) resolves the skill
and calls one generic function, `runFieldGeneration`
(`src/lib/ai/tasks.ts`), which appends format instructions for the data
type. Text-based output only for now; file/image output is not implemented.
PDF sources only work with Anthropic-backed skills.

## AI task flow

The Create chat assistant is decoupled from the skills concept (it isn't a
form-builder feature) and has its own single setting instead:

1. `resolveChatProvider()` (`src/lib/data/providers.ts`) looks up the
   admin-configured provider/model from `ampersand.chat_settings` and joins
   in the provider's API key — server-only.
2. `runChatAnswer()` (`src/lib/ai/tasks.ts`) builds a grounded prompt from
   retrieved archive snippets and calls `generateText()`.
3. AI output is always returned to the client for review/editing before
   being persisted — nothing is written to the database directly from an AI
   response (per AGENTS.md: "AI output is not automatically truth").

## Known simplifications (see ADRs for the "why")

- Create's retrieval is Postgres full-text search, not embeddings
  ([ADR 0005](../decisions/0005-keyword-search-not-embeddings.md)).
- No end-user auth ([ADR 0003](../decisions/0003-no-auth-in-prototype.md)).
- No automated migration runner (manual SQL Editor application).
