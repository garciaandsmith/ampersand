import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { AiProvider } from "@/lib/types";

export type GenerateTextInput = {
  provider: AiProvider;
  model: string;
  system?: string;
  prompt: string;
  /** Optional base64 image to include (data URL without the `data:` prefix stripped by caller). */
  imageBase64?: { mediaType: string; data: string };
};

/** Calls the given provider/model and returns the plain-text response. Server-only. */
export async function generateText(input: GenerateTextInput): Promise<string> {
  const { provider, model, system, prompt, imageBase64 } = input;

  if (provider.type === "anthropic") {
    const client = new Anthropic({ apiKey: provider.api_key });
    const content: Anthropic.MessageParam["content"] = imageBase64
      ? [
          {
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
          },
          { type: "text", text: prompt },
        ]
      : prompt;

    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content }],
    });

    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
  }

  if (provider.type === "openai") {
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
      messages: [
        ...(system ? [{ role: "system" as const, content: system }] : []),
        { role: "user", content },
      ],
    });

    return response.choices[0]?.message?.content?.trim() ?? "";
  }

  throw new Error(`Unsupported provider type: ${provider.type}`);
}
