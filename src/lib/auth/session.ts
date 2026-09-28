import "server-only";
import { redirect } from "next/navigation";
import { supabaseAuthServer } from "@/lib/supabase/authServer";
import { getProfile, getProjectMemberRole } from "@/lib/data/users";
import type { Profile, ProjectRole } from "@/lib/types";

export type SessionUser = {
  id: string;
  email: string;
  profile: Profile;
};

/**
 * Who's signed in, or null. Every check below is built on this — there is
 * no RLS enforcing access (see ADR 0002/0003's successor): 100% of data
 * access goes through Server Actions/Components already, so authorization
 * lives here rather than in Postgres policies.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // The profile row is created by a DB trigger the moment an admin invites
  // someone (see migration 0013); a signed-in auth user with no profile
  // shouldn't normally happen, but treat it as logged-out rather than crash.
  const profile = await getProfile(user.id);
  if (!profile) return null;

  return { id: user.id, email: user.email ?? profile.email, profile };
}

/** What this user can do on a given project: their project_members role, 'admin' if they're a platform admin, or null (no access). */
export type EffectiveRole = ProjectRole | "admin";

const ROLE_RANK: Record<EffectiveRole, number> = { user: 0, editor: 1, admin: 2 };

async function resolveProjectRole(user: SessionUser, projectId: string): Promise<EffectiveRole | null> {
  if (user.profile.is_admin) return "admin";
  return getProjectMemberRole(projectId, user.id);
}

// --- Page/layout guards (redirect) ------------------------------------------
// Use these in Server Components (layouts, pages): there's a page being
// rendered, so an unauthorized visitor can be sent somewhere sensible.

/** Redirects to /login if not signed in. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Redirects non-admins to the app root. */
export async function requireAdminPage(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.profile.is_admin) redirect("/");
  return user;
}

/** Redirects to the app root if the user has no access (or too little) on this project. Returns their resolved role along with the user. */
export async function requireProjectAccessPage(
  projectId: string,
  minRole: ProjectRole = "user",
): Promise<{ user: SessionUser; role: EffectiveRole }> {
  const user = await requireUser();
  const role = await resolveProjectRole(user, projectId);
  if (!role || ROLE_RANK[role] < ROLE_RANK[minRole]) redirect("/");
  return { user, role };
}

// --- Server Action guards (throw) -------------------------------------------
// Server Actions are their own callable endpoints, reachable independent of
// whichever page happened to render them — every mutating action calls one
// of these itself rather than trusting that only a gated page could have
// reached it. There's no page to redirect from, so these throw; the
// existing action pattern already throws plain Errors for validation
// failures (e.g. "Missing project id"), so this is consistent.

export async function requireUserAction(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sign in required.");
  return user;
}

export async function requireAdminAction(): Promise<SessionUser> {
  const user = await requireUserAction();
  if (!user.profile.is_admin) throw new Error("Admin access required.");
  return user;
}

export async function requireProjectRoleAction(
  projectId: string,
  minRole: ProjectRole = "user",
): Promise<SessionUser> {
  const user = await requireUserAction();
  const role = await resolveProjectRole(user, projectId);
  if (!role || ROLE_RANK[role] < ROLE_RANK[minRole]) {
    throw new Error("You don't have access to this project.");
  }
  return user;
}
