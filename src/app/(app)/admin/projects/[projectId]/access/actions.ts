"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/auth/session";
import { addProjectMember, removeProjectMember, updateProjectMemberRole } from "@/lib/data/users";
import type { ProjectRole } from "@/lib/types";

function readRole(formData: FormData): ProjectRole {
  const role = String(formData.get("role") ?? "");
  if (role !== "editor" && role !== "user") throw new Error("Invalid role");
  return role;
}

export async function addProjectMemberAction(formData: FormData) {
  await requireAdminAction();

  const projectId = String(formData.get("projectId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!projectId || !userId) throw new Error("Missing project or user id");
  const role = readRole(formData);

  await addProjectMember(projectId, userId, role);
  revalidatePath(`/admin/projects/${projectId}/access`);
}

export async function updateProjectMemberRoleAction(formData: FormData) {
  await requireAdminAction();

  const projectId = String(formData.get("projectId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!projectId || !userId) throw new Error("Missing project or user id");
  const role = readRole(formData);

  await updateProjectMemberRole(projectId, userId, role);
  revalidatePath(`/admin/projects/${projectId}/access`);
}

export async function removeProjectMemberAction(formData: FormData) {
  await requireAdminAction();

  const projectId = String(formData.get("projectId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!projectId || !userId) throw new Error("Missing project or user id");

  await removeProjectMember(projectId, userId);
  revalidatePath(`/admin/projects/${projectId}/access`);
}
