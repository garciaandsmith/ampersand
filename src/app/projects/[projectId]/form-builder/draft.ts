import type { FieldDataType, FormField, InputType, SkillKey } from "@/lib/types";

export type DraftField = {
  id: string;
  name: string;
  data_type: FieldDataType;
  options: string[] | null;
  input_type: InputType;
  automation_source_field_id: string | null;
  automation_prompt: string | null;
  skill_key: SkillKey | null;
  automation_provider_override_id: string | null;
  automation_model_override: string | null;
};

export type DraftFieldInput = {
  id: string;
  name: string;
  dataType: FieldDataType;
  options: string[] | null;
  inputType: InputType;
  automationSourceFieldId: string | null;
  automationPrompt: string | null;
  skillKey: SkillKey | null;
  automationProviderOverrideId: string | null;
  automationModelOverride: string | null;
};

const NEW_ID_PREFIX = "new:";

export function isNewDraftId(id: string): boolean {
  return id.startsWith(NEW_ID_PREFIX);
}

export function createDraftId(): string {
  return `${NEW_ID_PREFIX}${crypto.randomUUID()}`;
}

export function toDraftField(field: FormField): DraftField {
  return {
    id: field.id,
    name: field.name,
    data_type: field.data_type,
    options: field.options,
    input_type: field.input_type,
    automation_source_field_id: field.automation_source_field_id,
    automation_prompt: field.automation_prompt,
    skill_key: field.skill_key,
    automation_provider_override_id: field.automation_provider_override_id,
    automation_model_override: field.automation_model_override,
  };
}

export function toDraftFieldInput(field: DraftField): DraftFieldInput {
  return {
    id: field.id,
    name: field.name,
    dataType: field.data_type,
    options: field.options,
    inputType: field.input_type,
    automationSourceFieldId: field.automation_source_field_id,
    automationPrompt: field.automation_prompt,
    skillKey: field.skill_key,
    automationProviderOverrideId: field.automation_provider_override_id,
    automationModelOverride: field.automation_model_override,
  };
}
