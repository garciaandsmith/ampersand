import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { supabaseAuthServer } from "@/lib/supabase/authServer";

/**
 * Where every Supabase email link lands (invite, magic link, password
 * recovery) — the `emailRedirectTo` / `redirectTo` this app always passes.
 * `token_hash` + `type` is Supabase's documented Next.js App Router pattern
 * for verifying these links server-side and establishing the session cookie.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = await supabaseAuthServer();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      // Invite and recovery links prove identity but carry no password yet —
      // send those straight to the form that sets one.
      redirect(type === "invite" || type === "recovery" ? "/auth/set-password" : next);
    }
  }

  redirect("/login?error=invalid-link");
}
