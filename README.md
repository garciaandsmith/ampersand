AMPERSAND (&)

A content generation operative system — see `AGENTS.md` for product context
and `docs/architecture/overview.md` for the current technical state.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project's values
```

Apply the SQL in `supabase/migrations/` (in order) via the Supabase SQL
Editor, then expose the `ampersand` schema under Project Settings → Data API
→ Exposed schemas (Supabase only serves `public` by default).

Create the private `archive` storage bucket once:

```bash
node --env-file=.env.local scripts/setup-storage.mjs
```

Then run the dev server:

```bash
npm run dev
```

Connect at least one AI provider (Anthropic and/or OpenAI) and assign it to
the tasks under **Admin → Settings** before the AI-powered parts of Archive
and Create will work.
