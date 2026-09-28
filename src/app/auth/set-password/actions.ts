"use server";

import { redirect } from "next/navigation";
import { supabaseAuthServer } from "@/lib/supabase/authServer";

export async function setPasswordAction(
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords don't match." };

  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your sign-in link expired — request a new one from /login." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  redirect("/");
}
