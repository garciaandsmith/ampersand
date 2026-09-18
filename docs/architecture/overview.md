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

## AI task flow

1. Admin connects one or more providers (name + type + API key) and assigns
   each task a provider + model in Admin → Settings.
2. `resolveTaskProvider(taskKey)` (`src/lib/data/providers.ts`) looks up the
   assignment and joins in the provider's API key — server-only.
3. `src/lib/ai/tasks.ts` has one function per product-level operation
   (`runFieldAutomation`, `runVisualRecognition`, `runChatAnswer`), each
   building a task-specific prompt and calling `generateText()`.
4. AI output is always returned to the client for review/editing before
   being persisted — nothing is written to the database directly from an AI
   response (per AGENTS.md: "AI output is not automatically truth").

## Known simplifications (see ADRs for the "why")

- Create's retrieval is Postgres full-text search, not embeddings
  ([ADR 0005](../decisions/0005-keyword-search-not-embeddings.md)).
- No end-user auth ([ADR 0003](../decisions/0003-no-auth-in-prototype.md)).
- No automated migration runner (manual SQL Editor application).
