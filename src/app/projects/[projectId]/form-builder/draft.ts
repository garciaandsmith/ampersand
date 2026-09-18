import type { FieldDataType, FormField, InputType } from "@/lib/types";

export type DraftField = {
  id: string;
  name: string;
  data_type: FieldDataType;
  options: string[] | null;
  input_type: InputType;
  automation_source_field_id: string | null;
  automation_prompt: string | null;
};

export type DraftFieldInput = {
  id: string;
  name: string;
  dataType: FieldDataType;
  options: string[] | null;
  inputType: InputType;
  automationSourceFieldId: string | null;
  automationPrompt: string | null;
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
  };
}
