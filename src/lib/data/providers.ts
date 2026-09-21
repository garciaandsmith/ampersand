import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { NO_PARAMS, type GenerationParams } from "@/lib/ai/models";
import type { AiProvider, AiProviderPublic, AiSkill, ChatSettings, EnabledModel, SkillKind } from "@/lib/types";

export async function listProviders(): Promise<AiProviderPublic[]> {
  const { data, error } = await supabaseAdmin()
    .from("ai_providers")
    .select("id, name, type, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as AiProviderPublic[];
}

export async function getProvider(id: string): Promise<AiProvider | null> {
  const { data, error } = await supabaseAdmin()
    .from("ai_providers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function createProvider(input: {
  name: string;
  type: "anthropic" | "openai";
  apiKey: string;
}): Promise<AiProviderPublic> {
  const { data, error } = await supabaseAdmin()
    .from("ai_providers")
    .insert({ name: input.name, type: input.type, api_key: input.apiKey })
    .select("id, name, type, created_at")
    .single();

  if (error) throw new Error(error.message);
  return data as AiProviderPublic;
}

export async function deleteProvider(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from("ai_providers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Models an admin added to the dropdowns from a provider's live list, on top of the built-in catalog. */
export async function listEnabledModels(): Promise<EnabledModel[]> {
  const { data, error } = await supabaseAdmin()
    .from("ai_enabled_models")
    .select("provider_id, model")
    .order("model", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Replaces the enabled models of the given providers with `selections`.
 * Providers not listed in `providerIds` are left alone.
 */
export async function replaceEnabledModels(
  providerIds: string[],
  selections: EnabledModel[],
): Promise<void> {
  if (providerIds.length === 0) return;
  const db = supabaseAdmin();

  const { error: deleteError } = await db
    .from("ai_enabled_models")
    .delete()
    .in("provider_id", providerIds);
  if (deleteError) throw new Error(deleteError.message);

  if (selections.length === 0) return;
  const { error: insertError } = await db.from("ai_enabled_models").insert(selections);
  if (insertError) throw new Error(insertError.message);
}

/** Skills are admin-managed recipes: a name, a provider + model, and optional tuning. */
export async function listSkills(): Promise<AiSkill[]> {
  const { data, error } = await supabaseAdmin()
    .from("ai_skills")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

type SkillInput = {
  name: string;
  kind: SkillKind;
  providerId: string | null;
  model: string | null;
  params: GenerationParams;
  /** Undefined leaves the stored instructions untouched (transcription skills, whose form doesn't show them). */
  instructions?: string | null;
};

export async function createSkill(input: SkillInput): Promise<AiSkill> {
  const { data, error } = await supabaseAdmin()
    .from("ai_skills")
    .insert({
      name: input.name,
      kind: input.kind,
      provider_id: input.providerId,
      model: input.model,
      effort: input.params.effort,
      max_output_tokens: input.params.maxOutputTokens,
      instructions: input.instructions ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateSkill(id: string, input: SkillInput): Promise<AiSkill> {
  const { data, error } = await supabaseAdmin()
    .from("ai_skills")
    .update({
      name: input.name,
      kind: input.kind,
      provider_id: input.providerId,
      model: input.model,
      effort: input.params.effort,
      max_output_tokens: input.params.maxOutputTokens,
      ...(input.instructions !== undefined ? { instructions: input.instructions } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSkill(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from("ai_skills").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** The Create chat assistant's provider+model — a single setting, unrelated to the skills list. */
export async function getChatSettings(): Promise<ChatSettings> {
  const { data, error } = await supabaseAdmin()
    .from("chat_settings")
    .select("provider_id, model")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? { provider_id: null, model: null };
}

export async function setChatSettings(input: {
  providerId: string | null;
  model: string | null;
}): Promise<ChatSettings> {
  const { data, error } = await supabaseAdmin()
    .from("chat_settings")
    .upsert(
      { id: true, provider_id: input.providerId, model: input.model, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    )
    .select("provider_id, model")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export type ResolvedModel = {
  provider: AiProvider;
  model: string;
  /** Which API to call. The chat assistant is always "chat". */
  kind: SkillKind;
  params: GenerationParams;
  /** Standing instructions from the skill, added to the system prompt. Null for chat and blank skills. */
  instructions: string | null;
};

function toResolved(
  row: {
    provider_id: string | null;
    model: string | null;
    kind?: SkillKind;
    effort?: AiSkill["effort"];
    max_output_tokens?: number | null;
    instructions?: string | null;
  } | null,
): ResolvedModel | null {
  if (!row || !row.provider_id || !row.model) return null;
  const provider = (row as unknown as { ai_providers: AiProvider | null }).ai_providers;
  if (!provider) return null;
  // Only skill rows carry tuning; chat settings resolve with no overrides.
  const params: GenerationParams =
    row.effort !== undefined || row.max_output_tokens !== undefined
      ? { effort: row.effort ?? null, maxOutputTokens: row.max_output_tokens ?? null }
      : NO_PARAMS;
  return {
    provider,
    model: row.model,
    kind: row.kind ?? "chat",
    params,
    // Transcription models take no instructions; ignore any left over from before the kind was switched.
    instructions: row.kind === "transcription" ? null : row.instructions?.trim() || null,
  };
}

/** Resolves the Create chat assistant's configured provider (with API key) + model. Server-only. */
export async function resolveChatProvider(): Promise<ResolvedModel | null> {
  const { data, error } = await supabaseAdmin()
    .from("chat_settings")
    .select("*, ai_providers(*)")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return toResolved(data);
}

/** Resolves a skill to its provider (with API key) + model. Null if either isn't set. Server-only. */
export async function resolveSkill(skillId: string): Promise<ResolvedModel | null> {
  const { data, error } = await supabaseAdmin()
    .from("ai_skills")
    .select("*, ai_providers(*)")
    .eq("id", skillId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return toResolved(data);
}
