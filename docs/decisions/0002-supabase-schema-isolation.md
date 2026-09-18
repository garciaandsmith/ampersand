# ADR 0002 — Dedicated `ampersand` Postgres schema, service-role-only access

## Status
Accepted

## Context
The Supabase project used for this prototype (`perabzmdxxvrqnbpusgq`) is an
existing project the user provided, not one created fresh for AMPERSAND. Its
`public` schema may hold unrelated data or grow to hold it later.

## Decision
All AMPERSAND tables live in a dedicated `ampersand` Postgres schema, not
`public`. Every table has Row Level Security enabled with **no** policies for
`anon` or `authenticated` — only the `service_role` key (used exclusively by
Next.js Server Actions and Server Components, never shipped to the browser)
can read or write.

Because Supabase's PostgREST API only serves `public` by default, this
required two manual one-time steps in the Supabase dashboard, captured in
`supabase/migrations/`:
1. Add `ampersand` to Project Settings → Data API → Exposed schemas.
2. Grant `service_role` usage on the schema and its tables (Supabase does not
   auto-grant on non-`public` schemas — see `0002_grants.sql`).

## Rationale
- Isolation: nothing AMPERSAND does can collide with or corrupt whatever else
  lives in this Supabase project.
- Security: with no end-user auth yet (see ADR 0003), locking every table to
  `service_role`-only access means there is no anon-key path to the data at
  all, rather than relying on carefully-written RLS policies to be correct.

## Consequences
- All data access must go through server-side code that holds the service
  role key. There is currently no client-side Supabase usage anywhere in the
  app — this is deliberate.
- When real end-user auth is added (Phase 1 hardening), this will need
  RLS policies for `authenticated` scoped by project membership, replacing
  the current "server-only" model for at least the read paths a logged-in
  user should have direct access to.

## Alternatives considered
- Using `public` with table name prefixes (e.g. `ampersand_projects`):
  rejected — schema-level isolation is cleaner and makes future removal or
  export trivial.
