import type { AiProviderType } from "@/lib/types";

export type ModelInfo = {
  id: string;
  label: string;
};

/**
 * Hand-maintained model catalog — update it when a provider ships or
 * retires a model. Verified against provider docs as of 2026-09.
 */
export const MODEL_CATALOG: Record<AiProviderType, ModelInfo[]> = {
  anthropic: [
    { id: "claude-fable-5-1", label: "Claude Fable 5.1 (most capable)" },
    { id: "claude-opus-5", label: "Claude Opus 5" },
    { id: "claude-sonnet-5", label: "Claude Sonnet 5" },
    { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
  ],
  openai: [
    { id: "gpt-6-astra", label: "GPT-6 Astra (flagship)" },
    { id: "gpt-5.6-sol", label: "GPT-5.6 Sol" },
    { id: "gpt-5.6-terra", label: "GPT-5.6 Terra" },
    { id: "gpt-5.6-luna", label: "GPT-5.6 Luna" },
    { id: "gpt-image-2.5-sunburst", label: "GPT Image 2.5 Sunburst" },
    { id: "gpt-image-2.5-flare", label: "GPT Image 2.5 Flare" },
  ],
};
