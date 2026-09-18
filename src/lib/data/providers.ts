import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type {
  AiProvider,
  AiProviderPublic,
  AiTaskAssignment,
  TaskKey,
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

export async function listTaskAssignments(): Promise<AiTaskAssignment[]> {
  const { data, error } = await supabaseAdmin()
    .from("ai_task_assignments")
    .select("*")
    .order("task_key", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function setTaskAssignment(input: {
  taskKey: TaskKey;
  providerId: string | null;
  model: string | null;
}): Promise<AiTaskAssignment> {
  const { data, error } = await supabaseAdmin()
    .from("ai_task_assignments")
    .upsert(
      {
        task_key: input.taskKey,
        provider_id: input.providerId,
        model: input.model,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "task_key" },
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/** Resolves a task to its configured provider (with API key) + model. Server-only. */
export async function resolveTaskProvider(
  taskKey: TaskKey,
): Promise<{ provider: AiProvider; model: string } | null> {
  const { data: assignment, error } = await supabaseAdmin()
    .from("ai_task_assignments")
    .select("*, ai_providers(*)")
    .eq("task_key", taskKey)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!assignment || !assignment.provider_id || !assignment.model) return null;

  const provider = (assignment as unknown as { ai_providers: AiProvider })
    .ai_providers;
  if (!provider) return null;

  return { provider, model: assignment.model };
}
