import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Refreshes the Supabase session cookie on every request, per Supabase's
// documented Next.js App Router pattern. This is the only place the auth
// token is refreshed — Server Components can read cookies but can't write
// them, so without this, sessions would silently expire.
//
// This does NOT gate access by itself: page-level checks (requireUser /
// requireAdminPage / requireProjectAccessPage in src/lib/auth/session.ts)
// are what actually redirect unauthenticated or unauthorized visitors, and
// Server Actions re-check independently (see src/lib/auth/session.ts) since
// they're callable directly, not just reached by navigating a gated page.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Must be called to trigger the refresh — the result isn't used here.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Skip static assets and Next.js internals; everything else (including
     * /login and /auth/*) runs through so the session cookie stays fresh
     * even on those pages.
     */
    "/((?!_next/static|_next/image|favicon.ico|brand/).*)",
  ],
};
