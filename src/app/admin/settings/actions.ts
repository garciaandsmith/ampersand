"use server";

import { revalidatePath } from "next/cache";
import {
  createProvider,
  createSkill,
  deleteProvider,
  deleteSkill,
  getChatSettings,
  getProvider,
  listEnabledModels,
  listProviders,
  listSkills,
  replaceEnabledModels,
  setChatSettings,
  updateSkill,
} from "@/lib/data/providers";
import { listAvailableModels } from "@/lib/ai/client";
import { MODEL_CATALOG, NO_PARAMS, normalizeParams, type GenerationParams } from "@/lib/ai/models";
import { SKILL_INSTRUCTIONS_MAX_LENGTH, type AiProviderType, type EnabledModel } from "@/lib/types";

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

  const provider = await createProvider({ name, type, apiKey });
  // Start with the catalog models ticked so the new provider's dropdowns aren't empty.
  await replaceEnabledModels(
    [provider.id],
    MODEL_CATALOG[type].map((m) => ({ provider_id: provider.id, model: m.id })),
  );
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

export type ProviderModelRow = {
  providerId: string;
  providerType: AiProviderType;
  /** Display label: name and type. */
  provider: string;
  model: string;
  createdAt: string | null;
  /** Ticked for the dropdowns but absent from the provider's live list (retired, or a catalog id that differs). */
  notListed?: boolean;
};

export type AllAvailableModels = {
  rows: ProviderModelRow[];
  /** Providers whose list loaded, i.e. the ones whose dropdown selection can be saved. */
  loadedProviderIds: string[];
  /** Providers whose model list couldn't be loaded, so one bad key doesn't hide the rest. */
  errors: { provider: string; message: string }[];
};

/** Loads the accessible models of every connected provider at once. */
export async function listAllAvailableModelsAction(): Promise<AllAvailableModels> {
  const [providers, enabled] = await Promise.all([listProviders(), listEnabledModels()]);
  const results = await Promise.all(
    providers.map(async (p) => {
      const label = `${p.name} (${p.type})`;
      try {
        const full = await getProvider(p.id);
        if (!full) throw new Error("Unknown provider");
        const models = await listAvailableModels(full);
        const rows = models.map((m) => ({
          providerId: p.id,
          providerType: p.type,
          provider: label,
          model: m.id,
          createdAt: m.createdAt ?? null,
        }));
        // Keep ticked models the live list no longer returns visible, so saving can't silently drop them.
        const live = new Set(models.map((m) => m.id));
        const missing = enabled
          .filter((e) => e.provider_id === p.id && !live.has(e.model))
          .map((e) => ({
            providerId: p.id,
            providerType: p.type,
            provider: label,
            model: e.model,
            createdAt: null,
            notListed: true,
          }));
        return { id: p.id, rows: [...rows, ...missing], error: null };
      } catch (e) {
        return { id: null, rows: [], error: { provider: label, message: (e as Error).message } };
      }
    }),
  );

  return {
    rows: results.flatMap((r) => r.rows),
    loadedProviderIds: results.flatMap((r) => (r.id ? [r.id] : [])),
    errors: results.flatMap((r) => (r.error ? [r.error] : [])),
  };
}

/**
 * Saves which models appear in the dropdowns. Only the providers that were
 * loaded are touched, so a provider that failed to load keeps its picks.
 * Models a skill or the chat assistant currently uses always stay ticked.
 */
export async function setEnabledModelsAction(
  providerIds: string[],
  selections: EnabledModel[],
): Promise<void> {
  const [skills, chat] = await Promise.all([listSkills(), getChatSettings()]);
  const inUse: EnabledModel[] = [
    ...skills.map((s) => ({ provider_id: s.provider_id, model: s.model })),
    { provider_id: chat.provider_id, model: chat.model },
  ].flatMap((m) => (m.provider_id && m.model ? [{ provider_id: m.provider_id, model: m.model }] : []));

  const allowed = new Set(providerIds);
  const merged = new Map<string, EnabledModel>();
  for (const s of [...selections, ...inUse]) {
    if (allowed.has(s.provider_id)) merged.set(`${s.provider_id}::${s.model}`, s);
  }
  await replaceEnabledModels(providerIds, [...merged.values()]);
  revalidatePath("/admin/settings");
}
