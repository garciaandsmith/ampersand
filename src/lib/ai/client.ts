import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI, { toFile } from "openai";
import type { AiProvider } from "@/lib/types";
import { extractAudioChunks } from "@/lib/media/audio";
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
   * Optional base64 PDF to include. Both providers accept PDFs natively —
   * Anthropic as a `document` block, OpenAI as a `file` content part — so no
   * text-extraction library is needed. `name` is required by OpenAI's format.
   */
  documentBase64?: { mediaType: "application/pdf"; data: string; name?: string };
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
    const client = new OpenAI({ apiKey: provider.api_key });
    const content: OpenAI.Chat.ChatCompletionContentPart[] = [{ type: "text", text: prompt }];
    if (documentBase64) {
      content.push({
        type: "file",
        file: {
          filename: documentBase64.name ?? "document.pdf",
          file_data: `data:${documentBase64.mediaType};base64,${documentBase64.data}`,
        },
      });
    }
    if (imageBase64) {
      content.push({
        type: "image_url",
        image_url: { url: `data:${imageBase64.mediaType};base64,${imageBase64.data}` },
      });
    }

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

/** OpenAI's transcription endpoint rejects files above this size. */
export const TRANSCRIPTION_MAX_BYTES = 25 * 1024 * 1024;

/** How many audio chunks are sent to the provider at once. */
const TRANSCRIPTION_CONCURRENCY = 3;

/**
 * Transcribes an audio or video file of any size: ffmpeg extracts the audio
 * from the file's URL and cuts it into short pieces, which are transcribed a
 * few at a time and joined in order. Server-only.
 *
 * Diarizing models label speakers per piece, so "Speaker A" in one piece isn't
 * guaranteed to be the same person as "Speaker A" in the next.
 */
export async function transcribeMedia(input: {
  provider: AiProvider;
  model: string;
  url: string;
  fileName: string;
}): Promise<string> {
  const { chunks } = await extractAudioChunks(input.url);
  const baseName = input.fileName.replace(/\.[^.]+$/, "") || "audio";

  const transcripts: string[] = new Array(chunks.length);
  let next = 0;
  const worker = async () => {
    while (next < chunks.length) {
      const i = next++;
      transcripts[i] = await transcribeAudio({
        provider: input.provider,
        model: input.model,
        data: chunks[i],
        fileName: `${baseName}-${i + 1}.mp3`,
      });
    }
  };
  await Promise.all(Array.from({ length: Math.min(TRANSCRIPTION_CONCURRENCY, chunks.length) }, worker));

  const parts = transcripts.filter(Boolean);
  return /diarize/i.test(input.model) ? parts.join("\n\n") : parts.join(" ");
}

/**
 * Speech-to-text for one audio file (max 25 MB): sends it to a transcription
 * model and returns the transcript. Only OpenAI is wired up. Server-only.
 */
async function transcribeAudio(input: {
  provider: AiProvider;
  model: string;
  data: Buffer;
  fileName: string;
}): Promise<string> {
  if (input.provider.type !== "openai") {
    throw new Error("Transcription is only supported with OpenAI transcription models (e.g. whisper-1, gpt-4o-transcribe).");
  }
  if (input.data.byteLength > TRANSCRIPTION_MAX_BYTES) {
    const mb = (input.data.byteLength / 1024 / 1024).toFixed(1);
    throw new Error(`An audio chunk is ${mb} MB; OpenAI transcription accepts at most 25 MB.`);
  }
  const client = new OpenAI({ apiKey: input.provider.api_key });
  const file = await toFile(input.data, input.fileName);

  // The diarize model labels who is speaking, but only in `diarized_json`, and it
  // needs `chunking_strategy` for anything over 30 seconds. Other models return plain text.
  if (/diarize/i.test(input.model)) {
    // The SDK's overloads don't narrow to the diarized shape from `response_format`, hence the cast.
    const result = (await client.audio.transcriptions.create({
      file,
      model: input.model,
      response_format: "diarized_json",
      chunking_strategy: "auto",
    })) as unknown as OpenAI.Audio.Transcriptions.TranscriptionDiarized;
    // Segments are often single clauses; merge consecutive ones from the same speaker into one turn.
    const turns: { speaker: string; text: string }[] = [];
    for (const s of result.segments) {
      const last = turns[turns.length - 1];
      if (last?.speaker === s.speaker) last.text += ` ${s.text.trim()}`;
      else turns.push({ speaker: s.speaker, text: s.text.trim() });
    }
    return turns.map((t) => `Speaker ${t.speaker}: ${t.text}`).join("\n\n");
  }

  const result = await client.audio.transcriptions.create({ file, model: input.model });
  return result.text.trim();
}
