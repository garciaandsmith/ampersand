import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { FieldDataType, FormField, InputType, SkillKey } from "@/lib/types";

export async function listFields(projectId: string): Promise<FormField[]> {
  const { data, error } = await supabaseAdmin()
    .from("form_fields")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function createField(input: {
  projectId: string;
  name: string;
  dataType: FieldDataType;
  options?: string[] | null;
  inputType: InputType;
  automationSourceFieldId?: string | null;
  automationPrompt?: string | null;
  skillKey?: SkillKey | null;
  automationProviderOverrideId?: string | null;
  automationModelOverride?: string | null;
  sortOrder: number;
  isCore?: boolean;
}): Promise<FormField> {
  const { data, error } = await supabaseAdmin()
    .from("form_fields")
    .insert({
      project_id: input.projectId,
      name: input.name,
      data_type: input.dataType,
      options: input.options ?? null,
      input_type: input.inputType,
      automation_source_field_id: input.automationSourceFieldId ?? null,
      automation_prompt: input.automationPrompt ?? null,
      skill_key: input.skillKey ?? null,
      automation_provider_override_id: input.automationProviderOverrideId ?? null,
      automation_model_override: input.automationModelOverride ?? null,
      sort_order: input.sortOrder,
      is_core: input.isCore ?? false,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateField(
  id: string,
  input: {
    name: string;
    dataType: FieldDataType;
    options?: string[] | null;
    inputType: InputType;
    automationSourceFieldId?: string | null;
    automationPrompt?: string | null;
    skillKey?: SkillKey | null;
    automationProviderOverrideId?: string | null;
    automationModelOverride?: string | null;
  },
): Promise<FormField> {
  const { data, error } = await supabaseAdmin()
    .from("form_fields")
    .update({
      name: input.name,
      data_type: input.dataType,
      options: input.options ?? null,
      input_type: input.inputType,
      automation_source_field_id: input.automationSourceFieldId ?? null,
      automation_prompt: input.automationPrompt ?? null,
      skill_key: input.skillKey ?? null,
      automation_provider_override_id: input.automationProviderOverrideId ?? null,
      automation_model_override: input.automationModelOverride ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteField(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from("form_fields").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateFieldAutomationSource(
  id: string,
  automationSourceFieldId: string,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("form_fields")
    .update({ automation_source_field_id: automationSourceFieldId })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function updateFieldOrder(id: string, sortOrder: number): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("form_fields")
    .update({ sort_order: sortOrder })
    .eq("id", id);

  if (error) throw new Error(error.message);
}
