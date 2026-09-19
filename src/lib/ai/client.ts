import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { AiProvider } from "@/lib/types";
import { DEFAULT_MAX_OUTPUT_TOKENS, NO_PARAMS, normalizeParams, type GenerationParams } from "@/lib/ai/models";

export type AvailableModel = {
  id: string;
  createdAt?: string;
  /** Capability flags the provider itself reports — only Anthropic exposes these today. */
  knownCapabilities?: string[];
};

/** Lists the models a provider's API key can actually access right now. Server-only. */
export async function listAvailableModels(provider: AiProvider): Promise<AvailableModel[]> {
  if (provider.type === "anthropic") {
    const client = new Anthropic({ apiKey: provider.api_key });
    const models: AvailableModel[] = [];
    for await (const m of client.models.list()) {
      const knownCapabilities: string[] = [];
      if (m.capabilities?.image_input?.supported) knownCapabilities.push("image input");
      if (m.capabilities?.pdf_input?.supported) knownCapabilities.push("PDF input");
      if (m.capabilities?.thinking?.supported) knownCapabilities.push("extended thinking");
      if (m.capabilities?.batch?.supported) knownCapabilities.push("batch");
      models.push({ id: m.id, createdAt: m.created_at, knownCapabilities });
    }
    return models;
  }

  if (provider.type === "openai") {
    const client = new OpenAI({ apiKey: provider.api_key });
    const models: AvailableModel[] = [];
    for await (const m of client.models.list()) {
      models.push({ id: m.id, createdAt: new Date(m.created * 1000).toISOString() });
    }
    return models;
  }

  throw new Error(`Unsupported provider type: ${provider.type}`);
}

export type GenerateTextInput = {
  provider: AiProvider;
  model: string;
  system?: string;
  prompt: string;
  /** Optional base64 image to include (data URL without the `data:` prefix stripped by caller). */
  imageBase64?: { mediaType: string; data: string };
  /**
   * Optional base64 PDF to include. Anthropic accepts PDFs natively as a
   * `document` content block (no extra library needed). OpenAI has no
   * equivalent path wired up here yet — see the error thrown below — so this
   * only works when `provider.type === "anthropic"`.
   */
  documentBase64?: { mediaType: "application/pdf"; data: string };
  /**
   * Optional tuning (effort, output-token limit). Anything the chosen model
   * doesn't support is dropped rather than sent, so a stale setting can't
   * cause an API error. Omitted/null values fall back to the model's default.
   */
  params?: GenerationParams;
};

/** Calls the given provider/model and returns the plain-text response. Server-only. */
export async function generateText(input: GenerateTextInput): Promise<string> {
  const { provider, model, system, prompt, imageBase64, documentBase64 } = input;
  const { effort, maxOutputTokens } = normalizeParams(provider.type, model, input.params ?? NO_PARAMS);
  const maxTokens = maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;

  if (provider.type === "anthropic") {
    const client = new Anthropic({ apiKey: provider.api_key });
    const blocks: Array<
      | { type: "text"; text: string }
      | {
          type: "image";
          source: {
            type: "base64";
            media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
            data: string;
          };
        }
      | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
    > = [];

    if (documentBase64) {
      blocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: documentBase64.data },
      });
    }
    if (imageBase64) {
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: imageBase64.mediaType as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp",
          data: imageBase64.data,
        },
      });
    }
    blocks.push({ type: "text", text: prompt });

    const content: Anthropic.MessageParam["content"] =
      blocks.length > 1 ? (blocks as Anthropic.MessageParam["content"]) : prompt;

    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content }],
      ...(effort ? { output_config: { effort } } : {}),
    });

    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
  }

  if (provider.type === "openai") {
    if (documentBase64) {
      throw new Error(
        "PDF input via OpenAI isn't implemented — OpenAI's chat API needs the Files API (or a text-extraction library like pdf-parse) for PDFs. Use a skill backed by an Anthropic model, which supports PDFs natively.",
      );
    }
    const client = new OpenAI({ apiKey: provider.api_key });
    const content: OpenAI.Chat.ChatCompletionContentPart[] = imageBase64
      ? [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${imageBase64.mediaType};base64,${imageBase64.data}`,
            },
          },
        ]
      : [{ type: "text", text: prompt }];

    const response = await client.chat.completions.create({
      model,
      max_completion_tokens: maxTokens,
      ...(effort ? { reasoning_effort: effort } : {}),
      messages: [
        ...(system ? [{ role: "system" as const, content: system }] : []),
        { role: "user", content },
      ],
    });

    return response.choices[0]?.message?.content?.trim() ?? "";
  }

  throw new Error(`Unsupported provider type: ${provider.type}`);
}
