"use server";

import { revalidatePath } from "next/cache";
import { createProvider, deleteProvider, getProvider, setSkillAssignment } from "@/lib/data/providers";
import { listAvailableModels, type AvailableModel } from "@/lib/ai/client";
import type { SkillKey } from "@/lib/types";

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

export async function setSkillAssignmentAction(formData: FormData) {
  const skillKey = String(formData.get("skillKey") ?? "") as SkillKey;
  const providerId = String(formData.get("providerId") ?? "") || null;
  const model = String(formData.get("model") ?? "").trim() || null;

  if (!skillKey) throw new Error("Missing skill key");

  await setSkillAssignment({ skillKey, providerId, model });
  revalidatePath("/admin/settings");
}

export async function listAvailableModelsAction(providerId: string): Promise<AvailableModel[]> {
  if (!providerId) throw new Error("Missing provider id");
  const provider = await getProvider(providerId);
  if (!provider) throw new Error("Unknown provider");
  return listAvailableModels(provider);
}
