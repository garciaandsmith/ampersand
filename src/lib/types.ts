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

/** A model an admin added to the dropdowns from a provider's live model list. */
export type EnabledModel = {
  provider_id: string;
  model: string;
};

/**
 * Provider-neutral effort scale. Each provider maps it onto its own dial
 * (Anthropic `output_config.effort`, OpenAI `reasoning_effort`). Which levels a
 * model accepts is listed per model in `src/lib/ai/models.ts`.
 */
export type EffortLevel = "low" | "medium" | "high" | "xhigh" | "max";

/**
 * Which job a skill does, and so which provider API it calls. Standard across
 * providers: each provider translates it in `src/lib/ai/client.ts`.
 * - chat: text/vision generation (reads text, images, PDFs).
 * - transcription: speech-to-text on an audio/video file.
 */
export type SkillKind = "chat" | "transcription";

export const SKILL_KIND_LABELS: Record<SkillKind, string> = {
  chat: "Text & vision (chat)",
  transcription: "Transcription (audio/video → text)",
};

/**
 * A skill is a named "recipe" managed by an admin in Settings: a kind, a provider +
 * model, plus optional tuning (effort, output-token limit) and standing
 * `instructions` (markdown, sent as part of the system prompt). Picking one in
 * the Form Builder selects that recipe for an automated field — it carries no
 * other requirements (source field, prompt) for the field it's attached to.
 * Null tuning values mean "use the model's default"; null instructions mean
 * the skill adds none.
 */
export type AiSkill = {
  id: string;
  name: string;
  kind: SkillKind;
  provider_id: string | null;
  model: string | null;
  effort: EffortLevel | null;
  max_output_tokens: number | null;
  instructions: string | null;
  created_at: string;
  updated_at: string;
};

/** Cap on a skill's instructions — they're sent with every call, so keep them focused. */
export const SKILL_INSTRUCTIONS_MAX_LENGTH = 30000;

/** The Create chat assistant's provider+model, configured separately from the skills list. */
export type ChatSettings = {
  provider_id: string | null;
  model: string | null;
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
  /** Which skill's provider+model this field's generation uses. Null on legacy rows or manual fields. */
  skill_id: string | null;
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

/**
 * What a file-type field's `value_jsonb` holds (its `value_text` is the storage
 * path). `thumbPath` is a JPEG preview generated in the browser at upload time
 * for images and videos; absent on older records and on other file kinds.
 */
export type StoredFileMeta = {
  name?: string;
  type?: string;
  thumbPath?: string | null;
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
