import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { listProjectFilePaths, removeArchiveFiles } from "@/lib/data/archive";
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

/** Deletes a project and everything under it (fields, archive records/values cascade at the DB level), plus their uploaded files. */
export async function deleteProject(id: string): Promise<void> {
  const paths = await listProjectFilePaths(id);
  const { error } = await supabaseAdmin().from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await removeArchiveFiles(paths);
}
