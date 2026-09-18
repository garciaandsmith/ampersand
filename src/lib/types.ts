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

export type TaskKey =
  | "field_automation"
  | "visual_recognition"
  | "summary_generation"
  | "chat";

export const TASK_LABELS: Record<TaskKey, string> = {
  field_automation: "Automated form fields",
  visual_recognition: "Visual recognition",
  summary_generation: "Summary generation",
  chat: "Create / chat generation",
};

export type AiTaskAssignment = {
  task_key: TaskKey;
  provider_id: string | null;
  model: string | null;
  updated_at: string;
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
  sort_order: number;
  is_core: boolean;
  created_at: string;
};

export type ArchiveItem = {
  id: string;
  project_id: string;
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
