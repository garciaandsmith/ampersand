import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabaseAdmin()
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabaseAdmin()
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function createProject(input: {
  name: string;
  users?: string | null;
}): Promise<Project> {
  const { data, error } = await supabaseAdmin()
    .from("projects")
    .insert({ name: input.name, users: input.users ?? null })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
