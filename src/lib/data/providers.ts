import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type {
  AiProvider,
  AiProviderPublic,
  AiSkillAssignment,
  SkillKey,
} from "@/lib/types";

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

export async function listSkillAssignments(): Promise<AiSkillAssignment[]> {
  const { data, error } = await supabaseAdmin()
    .from("ai_skill_assignments")
    .select("*")
    .order("skill_key", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function setSkillAssignment(input: {
  skillKey: SkillKey;
  providerId: string | null;
  model: string | null;
}): Promise<AiSkillAssignment> {
  const { data, error } = await supabaseAdmin()
    .from("ai_skill_assignments")
    .upsert(
      {
        skill_key: input.skillKey,
        provider_id: input.providerId,
        model: input.model,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "skill_key" },
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/** Resolves a skill to its configured provider (with API key) + model. Server-only. */
export async function resolveSkillProvider(
  skillKey: SkillKey,
): Promise<{ provider: AiProvider; model: string } | null> {
  const { data: assignment, error } = await supabaseAdmin()
    .from("ai_skill_assignments")
    .select("*, ai_providers(*)")
    .eq("skill_key", skillKey)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!assignment || !assignment.provider_id || !assignment.model) return null;

  const provider = (assignment as unknown as { ai_providers: AiProvider })
    .ai_providers;
  if (!provider) return null;

  return { provider, model: assignment.model };
}

/**
 * Resolves the provider+model that should run one automated form field's
 * generation: a per-field owner/admin override if the field has one, else
 * the field's skill's default assignment from Admin > Settings.
 *
 * The override columns exist on `form_fields` today, but nothing currently
 * writes to them — FieldForm doesn't yet expose the override UI, pending a
 * decision on how to gate it (see docs/decisions/0003-no-auth-in-prototype.md).
 * This function already prefers an override when one is present, so wiring
 * the UI later needs no further data-layer changes.
 */
export async function resolveFieldAutomationProvider(field: {
  skill_key: SkillKey | null;
  automation_provider_override_id: string | null;
  automation_model_override: string | null;
}): Promise<{ provider: AiProvider; model: string } | null> {
  if (field.automation_provider_override_id && field.automation_model_override) {
    const provider = await getProvider(field.automation_provider_override_id);
    if (provider) {
      return { provider, model: field.automation_model_override };
    }
  }
  return resolveSkillProvider(field.skill_key ?? "field_automation");
}
