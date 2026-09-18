# ADR 0001 — Web framework: Next.js App Router

## Status
Accepted

## Context
AGENTS.md names Vercel as the preferred hosting platform and Supabase as the
preferred backend, but had not settled on an application framework. A
prototype needed to be built covering the full wireframe (admin, Archive,
Form Builder, Create) to validate the product concept end to end.

## Decision
Use Next.js (App Router, TypeScript, Tailwind CSS v4) as the application
framework, with Server Actions for all mutations instead of a separate API
layer.

## Rationale
- Next.js is Vercel's own framework — zero-friction deployment to the
  already-decided hosting target.
- Server Actions let server-only code (Supabase service-role calls, AI
  provider calls with secret API keys) live next to the UI that uses it,
  without hand-rolling API routes for every mutation.
- App Router's server components fit this app's shape well: almost every
  screen is a thin view over live Supabase data.

## Consequences
- The whole app is effectively dynamic (`export const dynamic =
  "force-dynamic"` in the root layout) since every route reads live data;
  there is no static prerendering to reason about.
- Server Actions are a Next.js-specific pattern; migrating off Next.js later
  would mean rebuilding the mutation layer as conventional API routes.

## Alternatives considered
- A separate SPA (Vite/React) + API routes: more moving parts, no benefit
  given Vercel is already the target.
