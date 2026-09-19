import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { AiProvider, AiProviderPublic, AiSkill, ChatSettings } from "@/lib/types";

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

/** Skills are just named provider+model shortcuts, fully admin-managed. */
export async function listSkills(): Promise<AiSkill[]> {
  const { data, error } = await supabaseAdmin()
    .from("ai_skills")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function createSkill(input: {
  name: string;
  providerId: string | null;
  model: string | null;
}): Promise<AiSkill> {
  const { data, error } = await supabaseAdmin()
    .from("ai_skills")
    .insert({ name: input.name, provider_id: input.providerId, model: input.model })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateSkill(
  id: string,
  input: { name: string; providerId: string | null; model: string | null },
): Promise<AiSkill> {
  const { data, error } = await supabaseAdmin()
    .from("ai_skills")
    .update({
      name: input.name,
      provider_id: input.providerId,
      model: input.model,
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

type ResolvedModel = { provider: AiProvider; model: string };

function toResolved(
  row: { provider_id: string | null; model: string | null } | null,
): ResolvedModel | null {
  if (!row || !row.provider_id || !row.model) return null;
  const provider = (row as unknown as { ai_providers: AiProvider | null }).ai_providers;
  return provider ? { provider, model: row.model } : null;
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
