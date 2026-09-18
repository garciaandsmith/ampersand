# ADR 0003 — No end-user authentication in this prototype

## Status
Accepted (provisional — expected to be revisited)

## Context
AGENTS.md's Phase 1 scope includes authentication, users, roles/permissions,
and user-to-project assignment. This build was explicitly scoped (by user
decision, in conversation) to prioritize proving out the full product concept
— Archive, Form Builder, AI-driven field automation, and the RAG-grounded
Create chat — over building real auth first.

## Decision
The prototype has no login and no session concept. Every screen is reachable
by anyone who can reach the deployed URL. The `projects.users` column is a
free-text field (comma-separated emails or names) with no enforcement — it
records intent, not access control.

This is safe only because of ADR 0002: every table is locked to
`service_role`, so there is no anon-accessible data path even without auth
in front of the UI itself.

## Rationale
Building full auth (login, roles, project-scoped access) before validating
whether the Archive/Form Builder/Create concept itself works would have
front-loaded the more mechanical, well-understood part of the build (Phase 1
of AGENTS.md) ahead of the part with real product risk (Phases 2–4).

## Consequences
- **Do not deploy this prototype publicly without adding at least basic
  auth in front of it** — anyone with the URL has full read/write access to
  every project, every AI provider API key's usage (though not the key
  values themselves, which never leave the server), and can rack up AI
  spend.
- Revisiting this is the natural next step before this stops being a
  prototype: Supabase Auth + RLS policies scoped by project membership,
  replacing the current service-role-only model for user-facing reads.

## Alternatives considered
- A single shared password gate: rejected as not worth building — real
  Supabase Auth is not meaningfully more work and avoids a throwaway step.
