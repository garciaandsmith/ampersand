# ADR 0009 — Supabase Auth, invite-only, server-side authorization (no RLS for authenticated)

## Status
Accepted

## Context
[ADR 0003](0003-no-auth-in-prototype.md) deliberately deferred end-user
authentication so the Archive/Form Builder/Create concept could be validated
first. That's done; this is the "add real auth" step it named as the natural
next move, ahead of a first Vercel deployment. AGENTS.md's admin model for
this is fixed by product decision (in conversation, not inferred): **Admin**
(platform-wide, full power everywhere), **Editor** (full content/form power
within assigned projects), **User** (read-only browse/search + Create,
within assigned projects) — invite-only, no public sign-up, centralized
around admin(s).

## Decision
**Identity: Supabase Auth, invite-only.**
- Public sign-up is disabled in the Supabase dashboard (Authentication
  settings), not in application code — there is no sign-up form anywhere in
  the app.
- The only way an account is created is an admin inviting an email from
  Admin → Users (`supabaseAdmin().auth.admin.inviteUserByEmail()`,
  `src/lib/data/users.ts`). This creates the `auth.users` row immediately;
  the person just can't sign in until they follow the invite email.
- After following an invite, magic-link, or password-reset email, everyone
  lands on the same route handler (`src/app/auth/confirm/route.ts`, using
  Supabase's documented `token_hash`/`type` verification pattern). Invite and
  recovery links continue to `/auth/set-password`; a magic link's own type
  continues straight to the app.
- Both a password and a magic link work for every account, always, by the
  user's own choice each time they sign in (`src/app/login/LoginForm.tsx`) —
  setting a password during invite doesn't disable magic links, and using a
  magic link doesn't require ever setting one.
- `ampersand.profiles` mirrors `auth.users` 1:1 (created by an `AFTER INSERT
  ON auth.users` trigger, migration 0013) and holds `is_admin`. Per-project
  access is `ampersand.project_members(project_id, user_id, role)`, `role`
  being `editor` or `user` — admins don't need a row here, `is_admin` already
  grants full access everywhere.

**Authorization: server-side checks, not Postgres RLS for `authenticated`.**
Every table stays `service_role`-only, exactly as ADR 0002 already set up —
this ADR doesn't change that, it explains why it *still* applies now that
auth exists. The reasoning: 100% of the app's Supabase access already goes
through Next.js Server Actions/Server Components (there has never been
client-side Supabase usage in this app). An `authenticated`-role RLS policy
would only ever be evaluated for queries this same server code issues with
the service-role key anyway — it would add real complexity (policy
authoring, policy testing, keeping policies in sync with the role model) for
no additional enforcement, since there is no anon/authenticated-key path to
the data to begin with.

Instead, `src/lib/auth/session.ts` is the single place that resolves "who is
this, and what can they do":
- `getCurrentUser()` — reads the session (via `@supabase/ssr`,
  `src/lib/supabase/authServer.ts`) and joins in the `profiles` row.
- Page/layout guards (`requireUser`, `requireAdminPage`,
  `requireProjectAccessPage`) — call `redirect()`; used in
  `src/app/(app)/layout.tsx`, `admin/layout.tsx`, and
  `projects/[projectId]/layout.tsx` so navigating to a page a visitor
  shouldn't see never renders it.
- Server Action guards (`requireUserAction`, `requireAdminAction`,
  `requireProjectRoleAction`) — throw instead, since a Server Action is its
  own callable endpoint independent of whichever page rendered it. Every
  mutating action in the app calls one of these itself; the page-level
  redirect is a UX nicety, not the enforcement boundary.

**Two Supabase clients beyond the existing admin one**, both anon-key,
both used only for identity/session — never for querying `ampersand`
tables (`supabaseAdmin()`, service-role, remains the only thing that does
that): `src/lib/supabase/authBrowser.ts` (Client Components) and
`src/lib/supabase/authServer.ts` (Server Components/Actions/Route
Handlers, cookie-based). `src/middleware.ts` refreshes the session cookie
on every request per Supabase's documented Next.js pattern.

**The origin used for email-link redirects** (`emailRedirectTo` /
`redirectTo`) is read from the incoming request's `Host` header
(`src/lib/site-url.ts`), not a hardcoded env var — this makes invite/magic-link
emails correct in local dev, Vercel preview, and production without needing
to keep an env var in sync per environment. It does require Supabase's
Authentication → URL Configuration to allow-list all three origins (see the
architecture overview's setup notes).

## Rationale
- Matches the fixed product requirement (Admin/Editor/User, invite-only,
  admin-centralized) directly, without inventing anything beyond it.
- Reuses 100% of the existing data-access pattern (Server Actions calling
  `supabaseAdmin()`) rather than introducing a second, RLS-policed path —
  one way to reach the database stays one way to reach the database.
- Keeps the door open: if a future feature needs the browser to talk to
  Supabase directly (this ADR doesn't require that not happen), RLS
  policies for `authenticated` can be added additively at that point,
  scoped by `project_members`/`profiles.is_admin` exactly as this ADR's
  model already defines them in Postgres — nothing here needs to be undone.

## Consequences
- Every current and future Server Action must remember to call the
  appropriate `requireX` guard itself — there's no database-level backstop.
  This is a discipline cost, not a one-time cost; code review should treat a
  new mutating action without one as a bug.
- `projects.users` (free text) is dropped (migration 0013); project access
  is now real, queryable, and enforced.
- The very first admin account can't be created through the app itself
  (inviting requires an admin to already exist) — see the architecture
  overview's setup notes for the one-time bootstrap step.
- Supabase's dashboard "Allow new users to sign up" toggle is necessary but
  not sufficient on its own: `signInWithOtp` (magic link) defaults to
  creating a new account for any email regardless of that toggle, so
  `src/app/login/actions.ts` passes `shouldCreateUser: false` explicitly.

## Alternatives considered
- **RLS policies for `authenticated`, with some reads moved to a
  browser-side Supabase client:** more "textbook" Supabase Auth usage, and
  would be defense-in-depth. Rejected for now per AGENTS.md's architecture
  principles (avoid premature complexity for the current phase) — there is
  no client-side Supabase access to defend, so the policies would duplicate
  logic the server already enforces without changing what's reachable from
  outside. Revisit only if/when a feature genuinely needs direct
  browser-to-Supabase access.
- **A single shared password gate in front of the whole app:** already
  rejected in ADR 0003 for the same reason it's wrong here — real accounts
  aren't meaningfully more work and this product needs per-user roles
  regardless.
