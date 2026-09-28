import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { listProjectFilePaths, removeArchiveFiles } from "@/lib/data/archive";
import { listUserProjectIds } from "@/lib/data/users";
import type { Project } from "@/lib/types";

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabaseAdmin()
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

/** All projects for an admin; only the ones a non-admin is assigned to otherwise. Drives the sidebar and root redirect. */
export async function listProjectsForUser(userId: string, isAdmin: boolean): Promise<Project[]> {
  if (isAdmin) return listProjects();

  const projectIds = await listUserProjectIds(userId);
  if (projectIds.length === 0) return [];

  const { data, error } = await supabaseAdmin()
    .from("projects")
    .select("*")
    .in("id", projectIds)
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

export async function createProject(input: { name: string }): Promise<Project> {
  const { data, error } = await supabaseAdmin()
    .from("projects")
    .insert({ name: input.name })
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
