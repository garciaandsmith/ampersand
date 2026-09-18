# ADR 0005 — Postgres full-text search for Create's retrieval, not embeddings

## Status
Accepted (provisional — AGENTS.md Phase 3 names embeddings as the intended
direction)

## Context
The Create chat (wireframe pages 8) needs to ground its answers in the
project's Archive content ("RAG features"). AGENTS.md's Phase 3 anticipates
Supabase's vector/embedding capabilities for this, but flags that as a
candidate, not a committed decision, and explicitly scopes RAG/embeddings
work as a later phase not to be started without being asked.

## Decision
`searchArchiveContent()` (`src/lib/data/chat.ts`) retrieves context for the
Create chat using Postgres `tsvector`/`websearch` full-text search over
`archive_item_values.value_text`, falling back to the most recent values if
the search query doesn't match anything. No embeddings, no vector column, no
embedding-generation step on ingestion.

## Rationale
This prototype needed a working end-to-end Create flow to be demonstrable
today. Keyword search needed no new infrastructure (the GIN index is created
in the same migration as the tables) and no embedding-model decision, while
still producing genuinely grounded, citeable answers for the demo.

## Consequences
- Retrieval quality is weaker than embeddings for paraphrased or conceptual
  queries (e.g. asking about "the beach photo" won't match content that only
  says "coastal trail" unless the words overlap).
- Swapping to embeddings later is additive, not a rewrite: add a `vector`
  column to `archive_item_values` (or a new table), populate it on
  create/update, and change `searchArchiveContent()`'s query — the calling
  code in `src/lib/ai/tasks.ts` and the chat UI don't need to change.

## Alternatives considered
- Standing up pgvector + an embedding provider now: rejected for this
  iteration per AGENTS.md's explicit Phase 3 sequencing and to keep the
  prototype's dependency surface small while the core product concept was
  still being validated.
