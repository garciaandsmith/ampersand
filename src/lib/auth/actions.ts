"use server";

import { redirect } from "next/navigation";
import { supabaseAuthServer } from "@/lib/supabase/authServer";

export async function signOutAction() {
  const supabase = await supabaseAuthServer();
  await supabase.auth.signOut();
  redirect("/login");
}
