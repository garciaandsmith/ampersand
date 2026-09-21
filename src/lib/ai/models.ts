import type { AiProviderType, EffortLevel } from "@/lib/types";

export const EFFORT_LABELS: Record<EffortLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "Extra high",
  max: "Max",
};

export type ModelInfo = {
  id: string;
  label: string;
  /** Effort levels this model accepts. Empty = the model has no effort setting. */
  effortLevels: EffortLevel[];
  /**
   * Highest output-token limit an admin can set, or null when the model has no
   * text-output limit (e.g. image models). This is a practical ceiling, not the
   * model's absolute maximum: calls are non-streaming, and the Anthropic SDK
   * refuses non-streaming requests above roughly this size.
   */
  maxOutputTokens: number | null;
};

/** Used when a skill leaves the token limit blank (or the model isn't in the catalog). */
export const DEFAULT_MAX_OUTPUT_TOKENS = 4096;

const CEILING = 16000;
const ALL_EFFORT_LEVELS: EffortLevel[] = ["low", "medium", "high", "xhigh", "max"];
const BASIC_EFFORT_LEVELS: EffortLevel[] = ["low", "medium", "high"];

/**
 * Hand-maintained model catalog — update it when a provider ships or
 * retires a model. Verified against provider docs as of 2026-09 for Anthropic.
 * The OpenAI effort levels are a conservative guess (low/medium/high) that
 * still needs checking against OpenAI's docs for each model.
 */
export const MODEL_CATALOG: Record<AiProviderType, ModelInfo[]> = {
  anthropic: [
    { id: "claude-fable-5-1", label: "Claude Fable 5.1 (most capable)", effortLevels: ALL_EFFORT_LEVELS, maxOutputTokens: CEILING },
    { id: "claude-opus-5", label: "Claude Opus 5", effortLevels: ALL_EFFORT_LEVELS, maxOutputTokens: CEILING },
    { id: "claude-sonnet-5", label: "Claude Sonnet 5", effortLevels: ALL_EFFORT_LEVELS, maxOutputTokens: CEILING },
    { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", effortLevels: [], maxOutputTokens: CEILING },
  ],
  openai: [
    { id: "gpt-6-astra", label: "GPT-6 Astra (flagship)", effortLevels: BASIC_EFFORT_LEVELS, maxOutputTokens: CEILING },
    { id: "gpt-5.6-sol", label: "GPT-5.6 Sol", effortLevels: BASIC_EFFORT_LEVELS, maxOutputTokens: CEILING },
    { id: "gpt-5.6-terra", label: "GPT-5.6 Terra", effortLevels: BASIC_EFFORT_LEVELS, maxOutputTokens: CEILING },
    { id: "gpt-5.6-luna", label: "GPT-5.6 Luna", effortLevels: BASIC_EFFORT_LEVELS, maxOutputTokens: CEILING },
    { id: "gpt-image-2.5-sunburst", label: "GPT Image 2.5 Sunburst", effortLevels: [], maxOutputTokens: null },
    { id: "gpt-image-2.5-flare", label: "GPT Image 2.5 Flare", effortLevels: [], maxOutputTokens: null },
  ],
};

/**
 * The dropdown options for a provider type: only the models an admin ticked in
 * Settings → "Available models". Catalog models keep their label and tuning
 * settings; any other ticked model shows by its raw id with no effort or token
 * settings, since we can't tell what it accepts.
 */
export function modelOptions(type: AiProviderType, enabledModelIds: string[]): ModelInfo[] {
  const catalog = MODEL_CATALOG[type];
  const known = catalog.filter((m) => enabledModelIds.includes(m.id));
  const extras = enabledModelIds
    .filter((id) => !catalog.some((m) => m.id === id))
    .sort()
    .map((id): ModelInfo => ({ id, label: id, effortLevels: [], maxOutputTokens: null }));
  return [...known, ...extras];
}

export function findModelInfo(type: AiProviderType, modelId: string | null): ModelInfo | undefined {
  return modelId ? MODEL_CATALOG[type].find((m) => m.id === modelId) : undefined;
}

/** The tuning settings a skill can carry. Null = "use the model's default". */
export type GenerationParams = {
  effort: EffortLevel | null;
  maxOutputTokens: number | null;
};

export const NO_PARAMS: GenerationParams = { effort: null, maxOutputTokens: null };

/**
 * Cleans raw tuning input against what the chosen model actually supports:
 * an unsupported effort is dropped, and a token limit is kept only if it's a
 * positive whole number (clamped to the model's ceiling). Anything invalid
 * becomes null, i.e. "use the default" — so a stale setting never causes an
 * API error after a model swap or a catalog change.
 */
export function normalizeParams(
  type: AiProviderType,
  modelId: string | null,
  raw: { effort?: string | null; maxOutputTokens?: number | null },
): GenerationParams {
  const info = findModelInfo(type, modelId);

  const effort =
    info && raw.effort && (info.effortLevels as string[]).includes(raw.effort)
      ? (raw.effort as EffortLevel)
      : null;

  let maxOutputTokens: number | null = null;
  const tokens = raw.maxOutputTokens;
  if (typeof tokens === "number" && Number.isInteger(tokens) && tokens > 0 && info?.maxOutputTokens !== null) {
    maxOutputTokens = info ? Math.min(tokens, info.maxOutputTokens!) : tokens;
  }

  return { effort, maxOutputTokens };
}
