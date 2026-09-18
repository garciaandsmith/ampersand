"use server";

import { revalidatePath } from "next/cache";
import { createProvider, deleteProvider, setTaskAssignment } from "@/lib/data/providers";
import type { TaskKey } from "@/lib/types";

export async function createProviderAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const apiKey = String(formData.get("apiKey") ?? "").trim();

  if (!name || !apiKey || (type !== "anthropic" && type !== "openai")) {
    throw new Error("Name, type, and API key are required");
  }

  await createProvider({ name, type, apiKey });
  revalidatePath("/admin/settings");
}

export async function deleteProviderAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing provider id");
  await deleteProvider(id);
  revalidatePath("/admin/settings");
}

export async function setTaskAssignmentAction(formData: FormData) {
  const taskKey = String(formData.get("taskKey") ?? "") as TaskKey;
  const providerId = String(formData.get("providerId") ?? "") || null;
  const model = String(formData.get("model") ?? "").trim() || null;

  if (!taskKey) throw new Error("Missing task key");

  await setTaskAssignment({ taskKey, providerId, model });
  revalidatePath("/admin/settings");
}
