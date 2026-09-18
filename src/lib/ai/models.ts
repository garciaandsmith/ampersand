import type { AiProviderType, SkillKey } from "@/lib/types";

/**
 * What a model can actually do. Neither Anthropic's nor OpenAI's API exposes
 * machine-readable "this model can do X" capability data in a standardized
 * way, so this is a hand-maintained catalog — update it when a provider
 * ships or retires a model. Verified against provider docs as of 2026-09.
 */
export type ModelCapability =
  | "text_generation"
  | "image_recognition"
  | "image_generation"
  | "document_parsing";

export type ModelInfo = {
  id: string;
  label: string;
  capabilities: ModelCapability[];
};

export const MODEL_CATALOG: Record<AiProviderType, ModelInfo[]> = {
  anthropic: [
    {
      id: "claude-fable-5-1",
      label: "Claude Fable 5.1 (most capable)",
      capabilities: ["text_generation", "image_recognition", "document_parsing"],
    },
    {
      id: "claude-opus-5",
      label: "Claude Opus 5",
      capabilities: ["text_generation", "image_recognition", "document_parsing"],
    },
    {
      id: "claude-sonnet-5",
      label: "Claude Sonnet 5",
      capabilities: ["text_generation", "image_recognition", "document_parsing"],
    },
    {
      id: "claude-haiku-4-5",
      label: "Claude Haiku 4.5",
      capabilities: ["text_generation", "image_recognition", "document_parsing"],
    },
  ],
  openai: [
    {
      id: "gpt-6-astra",
      label: "GPT-6 Astra (flagship)",
      capabilities: ["text_generation", "image_recognition", "document_parsing"],
    },
    {
      id: "gpt-5.6-sol",
      label: "GPT-5.6 Sol",
      capabilities: ["text_generation", "image_recognition", "document_parsing"],
    },
    {
      id: "gpt-5.6-terra",
      label: "GPT-5.6 Terra",
      capabilities: ["text_generation", "image_recognition", "document_parsing"],
    },
    {
      id: "gpt-5.6-luna",
      label: "GPT-5.6 Luna",
      capabilities: ["text_generation", "image_recognition", "document_parsing"],
    },
    {
      id: "gpt-image-2.5-sunburst",
      label: "GPT Image 2.5 Sunburst",
      capabilities: ["image_generation"],
    },
    {
      id: "gpt-image-2.5-flare",
      label: "GPT Image 2.5 Flare",
      capabilities: ["image_generation"],
    },
  ],
};

/** No Anthropic model appears here with `image_generation` — Anthropic doesn't ship an image-generation model. */
export const SKILL_REQUIRED_CAPABILITY: Record<SkillKey, ModelCapability> = {
  field_automation: "text_generation",
  summary_generation: "text_generation",
  image_recognition: "image_recognition",
  text_generation: "text_generation",
  document_parsing: "document_parsing",
  image_generation: "image_generation",
};

/** Models for a provider type that are eligible for the given skill. */
export function modelsForSkill(providerType: AiProviderType, skill: SkillKey): ModelInfo[] {
  const required = SKILL_REQUIRED_CAPABILITY[skill];
  return MODEL_CATALOG[providerType].filter((m) => m.capabilities.includes(required));
}
