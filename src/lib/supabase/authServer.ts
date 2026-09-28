import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side Supabase client, anon key + the visitor's session cookie.
 * Used exclusively for auth (reading the current session, signing out from a
 * Server Action, exchanging an email-link token) — never for querying
 * `ampersand` tables, which stay on supabaseAdmin() (see server.ts and ADR 0002).
 *
 * Call fresh per request (don't cache the client): it closes over the
 * current request's cookies.
 */
export async function supabaseAuthServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component render (not a Server Action or
            // Route Handler) — cookies can't be written there. The session
            // refresh in middleware.ts already keeps the cookie current, so
            // this is safe to ignore.
          }
        },
      },
    },
  );
}
