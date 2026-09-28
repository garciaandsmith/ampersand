import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client, anon key only. Used exclusively for
 * auth (sign in, sign out, set password) from Client Components — never for
 * querying `ampersand` tables, which stay server-only via supabaseAdmin()
 * (see src/lib/supabase/server.ts and ADR 0002).
 */
export function supabaseAuthBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
