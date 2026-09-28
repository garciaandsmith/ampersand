"use server";

import { redirect } from "next/navigation";
import { supabaseAuthServer } from "@/lib/supabase/authServer";
import { getSiteOrigin } from "@/lib/site-url";

export async function signInWithPasswordAction(
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  const supabase = await supabaseAuthServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Incorrect email or password." };

  redirect("/");
}

export async function sendMagicLinkAction(
  formData: FormData,
): Promise<{ error?: string; sent?: boolean }> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Email is required." };

  const origin = await getSiteOrigin();
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      // signInWithOtp defaults to creating a new account for any email —
      // this app is invite-only, so that must stay off regardless of the
      // dashboard's own "allow sign-ups" setting.
      shouldCreateUser: false,
    },
  });
  // Supabase doesn't reveal whether the address has an account either way,
  // so this can't be used to enumerate users — an unknown email gets the
  // same "check your inbox" response as a real invited one.
  if (error) return { error: error.message };
  return { sent: true };
}
