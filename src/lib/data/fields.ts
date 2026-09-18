import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { FieldDataType, FormField, InputType } from "@/lib/types";

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
      sort_order: input.sortOrder,
      is_core: input.isCore ?? false,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteField(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from("form_fields").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
