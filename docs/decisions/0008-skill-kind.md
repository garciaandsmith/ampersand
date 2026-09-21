# ADR 0008 — Skills have a type (chat or transcription) that decides which API is called

## Status
Accepted

## Context
Which API a skill calls was decided by matching the model's name ("whisper",
"transcribe") in code, so an admin couldn't override it and a model with an
unexpected name was misrouted. Effort and token limit, by contrast, are tuning
dials on the same kind of call.

## Decision
- `ai_skills.kind` (`chat` | `transcription`, default `chat`; migration 0011,
  which backfills skills whose model name looks like a transcription model).
  Labels: "Text & vision (chat)" and "Transcription (audio/video → text)".
- The kind is app-defined and provider-neutral; providers translate it in
  `src/lib/ai/client.ts` (`generateText` for chat, `transcribeAudio` for
  transcription). `runFieldGeneration` routes on `resolved.kind`, not on the
  model name, and errors clearly when the source and kind disagree.
- In Settings the Type dropdown comes first. It steers the model list — models
  that look right for the type first, the rest under a "don't look like…" group
  but still selectable — and switches off effort, token limit and instructions
  for transcription (its models accept none). Picking an obviously-transcription
  model pre-selects the Transcription type; never the reverse, so an admin's
  override sticks. Transcription needs an OpenAI provider for now.
- "Available models" gains a Type column and filter. OpenAI's model list says
  nothing about capabilities, so the type is a guess from the model name
  (`guessModelKind`), labelled as such; Anthropic's reported capabilities are
  shown too. It is for browsing only — the skill's kind is what changes behaviour.
- The Form Builder warns when a transcription skill's source isn't a file field.
  Transcription fields need no prompt.
- Saving a transcription skill leaves any stored instructions untouched rather
  than wiping them; they are simply not sent.
- `gpt-4o-transcribe-diarize` is called with `diarized_json` and
  `chunking_strategy: "auto"` (the API rejects longer-than-30 s audio without it)
  and its transcript is written as speaker turns ("Speaker A: …").

## Consequences
- Rules that are provider limits, not preferences, stay in code: the 25 MB
  transcription cap, which providers support which kind, per-model call options.
- New kinds (e.g. image generation) mean a new value, a translation in
  `client.ts`, and a form branch — no redesign.
- The model-name guess remains, but only for suggestions and browsing.
- Per-model capability flags saved in the database (replacing `MODEL_CATALOG`)
  remain a possible later step.

## Alternatives considered
- **Per-model capability flags in "Available models":** cleaner long-term, but
  more UI and data for a need that exists in one place today.
- **Keep guessing from the model name:** not overridable; misroutes new models.
