import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Anon-key client for the browser. It is used only to upload a file straight to
// the private "archive" bucket with a one-time signed upload token minted by a
// server action — it has no other access (the ampersand schema is locked down
// by RLS and no storage policies exist for anon).
export function supabaseBrowser(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
