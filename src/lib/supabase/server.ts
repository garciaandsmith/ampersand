import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client. The prototype has no end-user auth yet, so every table
// under the `ampersand` schema is locked down by RLS with no anon/authenticated
// policies — this is the only client that can read or write them. Never import
// this file from a Client Component.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  return createClient(url, key, {
    db: { schema: "ampersand" },
    auth: { persistSession: false },
  });
}
