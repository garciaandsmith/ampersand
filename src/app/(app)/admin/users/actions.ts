"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/auth/session";
import { deleteUser, inviteUser, setUserAdmin } from "@/lib/data/users";
import { getSiteOrigin } from "@/lib/site-url";

export async function inviteUserAction(formData: FormData) {
  await requireAdminAction();

  const email = String(formData.get("email") ?? "").trim();
  if (!email) throw new Error("Email is required");

  const origin = await getSiteOrigin();
  await inviteUser(email, `${origin}/auth/confirm`);
  revalidatePath("/admin/users");
}

export async function setUserAdminAction(formData: FormData) {
  const admin = await requireAdminAction();

  const userId = String(formData.get("userId") ?? "");
  const isAdmin = String(formData.get("isAdmin") ?? "") === "true";
  if (!userId) throw new Error("Missing user id");
  if (userId === admin.id && !isAdmin) {
    throw new Error("You can't remove your own admin access.");
  }

  await setUserAdmin(userId, isAdmin);
  revalidatePath("/admin/users");
}

export async function deleteUserAction(formData: FormData) {
  const admin = await requireAdminAction();

  const userId = String(formData.get("userId") ?? "");
  if (!userId) throw new Error("Missing user id");
  if (userId === admin.id) throw new Error("You can't remove your own account.");

  await deleteUser(userId);
  revalidatePath("/admin/users");
}
