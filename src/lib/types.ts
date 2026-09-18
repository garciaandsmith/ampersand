export type Project = {
  id: string;
  name: string;
  users: string | null;
  created_at: string;
};

export type AiProviderType = "anthropic" | "openai";

export type AiProvider = {
  id: string;
  name: string;
  type: AiProviderType;
  api_key: string;
  created_at: string;
};

export type AiProviderPublic = Omit<AiProvider, "api_key">;

export type SkillKey =
  | "field_automation"
  | "summary_generation"
  | "image_recognition"
  | "text_generation"
  | "document_parsing"
  | "image_generation";

export const SKILL_LABELS: Record<SkillKey, string> = {
  field_automation: "Automated form fields",
  summary_generation: "Summary generation",
  image_recognition: "Image recognition",
  text_generation: "Text generation / chat",
  document_parsing: "Document parsing",
  image_generation: "Image generation",
};

export type AiSkillAssignment = {
  skill_key: SkillKey;
  provider_id: string | null;
  model: string | null;
  updated_at: string;
};

/** Whether an automated field using this skill needs a source field picked. */
export const SKILL_NEEDS_SOURCE_FIELD: Record<SkillKey, boolean> = {
  field_automation: true,
  summary_generation: true,
  image_recognition: true,
  document_parsing: true,
  text_generation: false,
  image_generation: false,
};

/** Whether an automated field using this skill needs a prompt filled in (vs. an optional/default one). */
export const SKILL_NEEDS_PROMPT: Record<SkillKey, boolean> = {
  field_automation: true,
  summary_generation: false,
  image_recognition: false,
  document_parsing: false,
  text_generation: true,
  image_generation: true,
};

/** Which source-field data types make sense for each skill (e.g. image_recognition needs a file field). */
export const SKILL_SOURCE_FIELD_FILTER: Record<SkillKey, (dataType: FieldDataType) => boolean> = {
  field_automation: (dt) => dt !== "file",
  summary_generation: (dt) => dt !== "file",
  image_recognition: (dt) => dt === "file",
  document_parsing: (dt) => dt === "file",
  text_generation: () => true,
  image_generation: () => true,
};

export type FieldDataType =
  | "text"
  | "long_text"
  | "number"
  | "date"
  | "single_select"
  | "multi_select"
  | "tags"
  | "file"
  | "url";

export const FIELD_DATA_TYPE_LABELS: Record<FieldDataType, string> = {
  text: "Text",
  long_text: "Long text",
  number: "Number",
  date: "Date",
  single_select: "Closed list — single selection",
  multi_select: "Closed list — multiple selection",
  tags: "Tags",
  file: "Files & media",
  url: "URL",
};

export type InputType = "manual" | "automated";

export type FormField = {
  id: string;
  project_id: string;
  name: string;
  data_type: FieldDataType;
  options: string[] | null;
  input_type: InputType;
  automation_source_field_id: string | null;
  automation_prompt: string | null;
  /** Which AI skill governs this field's generation. Null on legacy rows created before this column existed. */
  skill_key: SkillKey | null;
  /** Owner/admin-only per-field override of the skill's default provider (see ADR 0003 — no role system yet). */
  automation_provider_override_id: string | null;
  automation_model_override: string | null;
  sort_order: number;
  is_core: boolean;
  created_at: string;
};

export type ArchiveItem = {
  id: string;
  project_id: string;
  title: string | null;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
  updated_at: string;
};

export type ArchiveItemValue = {
  id: string;
  item_id: string;
  field_id: string;
  value_text: string | null;
  value_jsonb: unknown | null;
};

export type ChatMessage = {
  id: string;
  project_id: string;
  role: "user" | "assistant";
  content: string;
  sources: { item_id: string; snippet: string }[] | null;
  created_at: string;
};
