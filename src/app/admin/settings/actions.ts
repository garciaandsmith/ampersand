"use server";

import { revalidatePath } from "next/cache";
import {
  createProvider,
  createSkill,
  deleteProvider,
  deleteSkill,
  getProvider,
  setChatSettings,
  updateSkill,
} from "@/lib/data/providers";
import { listAvailableModels, type AvailableModel } from "@/lib/ai/client";
import { NO_PARAMS, normalizeParams, type GenerationParams } from "@/lib/ai/models";
import { SKILL_INSTRUCTIONS_MAX_LENGTH } from "@/lib/types";

/** Reads the skill's instructions textarea; blank becomes null ("no instructions"). */
function readSkillInstructions(formData: FormData): string | null {
  const instructions = String(formData.get("instructions") ?? "").trim();
  if (instructions.length > SKILL_INSTRUCTIONS_MAX_LENGTH) {
    throw new Error(
      `Instructions are too long (${instructions.length.toLocaleString("en-US")} characters; the limit is ${SKILL_INSTRUCTIONS_MAX_LENGTH.toLocaleString("en-US")}).`,
    );
  }
  return instructions || null;
}

/**
 * Reads the skill form's tuning inputs and cleans them against the chosen
 * model, so the database only ever holds settings that model supports. The
 * form already hides unsupported inputs; this guards against stale or forged input.
 */
async function readSkillParams(
  formData: FormData,
  providerId: string | null,
  model: string | null,
): Promise<GenerationParams> {
  if (!providerId || !model) return NO_PARAMS;
  const provider = await getProvider(providerId);
  if (!provider) return NO_PARAMS;

  const tokensRaw = String(formData.get("maxOutputTokens") ?? "").trim();
  return normalizeParams(provider.type, model, {
    effort: String(formData.get("effort") ?? "") || null,
    maxOutputTokens: tokensRaw ? Number(tokensRaw) : null,
  });
}

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

export async function createSkillAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const providerId = String(formData.get("providerId") ?? "") || null;
  const model = String(formData.get("model") ?? "").trim() || null;

  if (!name) throw new Error("Name is required");

  const params = await readSkillParams(formData, providerId, model);
  await createSkill({ name, providerId, model, params, instructions: readSkillInstructions(formData) });
  revalidatePath("/admin/settings");
}

export async function updateSkillAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const providerId = String(formData.get("providerId") ?? "") || null;
  const model = String(formData.get("model") ?? "").trim() || null;

  if (!id) throw new Error("Missing skill id");
  if (!name) throw new Error("Name is required");

  const params = await readSkillParams(formData, providerId, model);
  await updateSkill(id, { name, providerId, model, params, instructions: readSkillInstructions(formData) });
  revalidatePath("/admin/settings");
}

export async function deleteSkillAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing skill id");
  await deleteSkill(id);
  revalidatePath("/admin/settings");
}

export async function setChatSettingsAction(formData: FormData) {
  const providerId = String(formData.get("providerId") ?? "") || null;
  const model = String(formData.get("model") ?? "").trim() || null;

  await setChatSettings({ providerId, model });
  revalidatePath("/admin/settings");
}

export async function listAvailableModelsAction(providerId: string): Promise<AvailableModel[]> {
  if (!providerId) throw new Error("Missing provider id");
  const provider = await getProvider(providerId);
  if (!provider) throw new Error("Unknown provider");
  return listAvailableModels(provider);
}
