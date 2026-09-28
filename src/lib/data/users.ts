import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Profile, ProjectMemberWithProfile, ProjectRole } from "@/lib/types";

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function listUsers(): Promise<Profile[]> {
  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Sends Supabase's invite email. The person becomes a real user the moment
 * this succeeds (their `auth.users` + `profiles` rows exist); they just
 * can't sign in until they follow the link. No public sign-up exists, so
 * this is the only way a new account gets created.
 */
export async function inviteUser(email: string, redirectTo: string): Promise<void> {
  const { error } = await supabaseAdmin().auth.admin.inviteUserByEmail(email, { redirectTo });
  if (error) throw new Error(error.message);
}

export async function setUserAdmin(userId: string, isAdmin: boolean): Promise<void> {
  const { error } = await supabaseAdmin().from("profiles").update({ is_admin: isAdmin }).eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function updateDisplayName(userId: string, displayName: string | null): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

/** Removes the auth.users row; cascades to `profiles` and `project_members`. */
export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabaseAdmin().auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
}

export async function getProjectMemberRole(
  projectId: string,
  userId: string,
): Promise<ProjectRole | null> {
  const { data, error } = await supabaseAdmin()
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data?.role as ProjectRole | undefined) ?? null;
}

export async function listProjectMembers(projectId: string): Promise<ProjectMemberWithProfile[]> {
  const { data, error } = await supabaseAdmin()
    .from("project_members")
    .select("project_id, user_id, role, created_at, profiles(email, display_name)")
    .eq("project_id", projectId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => {
    const profile = m.profiles as unknown as { email: string; display_name: string | null };
    return {
      project_id: m.project_id,
      user_id: m.user_id,
      role: m.role as ProjectRole,
      created_at: m.created_at,
      email: profile.email,
      display_name: profile.display_name,
    };
  });
}

export async function listUserProjectIds(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin()
    .from("project_members")
    .select("project_id")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.project_id);
}

export async function addProjectMember(
  projectId: string,
  userId: string,
  role: ProjectRole,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("project_members")
    .upsert({ project_id: projectId, user_id: userId, role });
  if (error) throw new Error(error.message);
}

export async function updateProjectMemberRole(
  projectId: string,
  userId: string,
  role: ProjectRole,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("project_members")
    .update({ role })
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function removeProjectMember(projectId: string, userId: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
