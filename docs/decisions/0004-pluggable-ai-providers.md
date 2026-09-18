# ADR 0004 — Admin-configured, pluggable AI providers per task

## Status
Accepted

## Context
The wireframe's Admin → Settings screen shows AI providers connected by name
and assigned per-task ("Summary generation → Provider 1, Model 1"), rather
than the application hard-coding a single AI vendor. The user wants to test
both Anthropic and OpenAI without a code change to switch between them.

## Decision
- `ampersand.ai_providers` stores named provider connections (`name`, `type`:
  `anthropic` | `openai`, `api_key`). Keys are entered via the Admin UI and
  stored server-side only — never sent to the client, never logged.
- `ampersand.ai_task_assignments` maps a fixed set of task keys
  (`field_automation`, `visual_recognition`, `summary_generation`, `chat`) to
  a provider + model string, editable independently in Admin → Settings.
- `src/lib/ai/client.ts` provides one `generateText()` function that
  branches on `provider.type` to call the Anthropic or OpenAI SDK, so
  call sites (`src/lib/ai/tasks.ts`) never know which vendor is in use.

## Rationale
Matches the wireframe's explicit design intent, and lets the user
A/B-test providers/models per task from the UI without redeploying.

## Consequences
- Adding a third provider means: extend the `type` check constraint in the
  migration, extend `AiProviderType` in `src/lib/types.ts`, and add a branch
  in `generateText()`. No changes needed anywhere else (task logic, UI).
- API keys sit in a database table rather than environment variables. This
  trades the usual "secrets belong in env vars" convention for the product
  requirement of runtime-configurable, per-task provider selection. The
  table is only reachable via `service_role` (ADR 0002), so this is
  equivalent in practice to an env-var-only approach in terms of exposure,
  but it does mean the keys are one `service_role`-authenticated query away
  rather than requiring server filesystem/environment access.

## Alternatives considered
- Environment-variable-only provider config: rejected — doesn't support the
  wireframe's "connect provider from the Admin UI, per-task assignment"
  requirement, and would need a redeploy to change providers or models.
