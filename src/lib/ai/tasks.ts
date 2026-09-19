import "server-only";
import { resolveChatProvider, type ResolvedModel } from "@/lib/data/providers";
import { generateText } from "@/lib/ai/client";
import type { FieldDataType } from "@/lib/types";

export type GenerationSource =
  | { kind: "text"; text: string }
  | { kind: "file"; mediaType: string; dataBase64: string };

/** What the model must return so the value fits the field's data type. */
function outputInstruction(dataType: FieldDataType, options: string[] | null): string {
  const list = (options ?? []).join(", ");
  switch (dataType) {
    case "text":
      return "Plain text on a single line.";
    case "long_text":
      return "Plain text. Multiple sentences or paragraphs are fine.";
    case "number":
      return "A single number only, with no units or text.";
    case "date":
      return "A single date in YYYY-MM-DD format only.";
    case "single_select":
      return `Exactly one of these options, copied verbatim: ${list}.`;
    case "multi_select":
      return `One or more of these options, copied verbatim, separated by commas: ${list}.`;
    case "tags":
      return "A comma-separated list of short tags.";
    case "url":
      return "A single URL only.";
    case "file":
      throw new Error("Generating a file or image as output isn't supported yet.");
  }
}

/**
 * Generic automated-field generation: read the source (if any), follow the
 * prompt, and answer in the format of the field's data type, using whichever
 * provider/model the field's skill points at.
 */
export async function runFieldGeneration(input: {
  fieldName: string;
  prompt: string;
  dataType: FieldDataType;
  options: string[] | null;
  source?: GenerationSource;
  resolved: ResolvedModel;
}): Promise<string> {
  const format = outputInstruction(input.dataType, input.options);

  const lines = [
    `You are filling in the "${input.fieldName}" field of a content archive record.`,
    `Instruction: ${input.prompt}`,
  ];
  if (input.source?.kind === "text") {
    lines.push("", "Source content:", input.source.text);
  } else if (input.source?.kind === "file") {
    lines.push("", "The source content is attached.");
  }
  lines.push(
    "",
    `Required output format: ${format}`,
    "Respond with only the value for the field — no preamble, no explanation.",
  );

  let imageBase64: { mediaType: string; data: string } | undefined;
  let documentBase64: { mediaType: "application/pdf"; data: string } | undefined;
  if (input.source?.kind === "file") {
    if (input.source.mediaType.startsWith("image/")) {
      imageBase64 = { mediaType: input.source.mediaType, data: input.source.dataBase64 };
    } else if (input.source.mediaType === "application/pdf") {
      documentBase64 = { mediaType: "application/pdf", data: input.source.dataBase64 };
    } else {
      throw new Error(
        `Source files of type "${input.source.mediaType}" aren't supported — only images and PDFs.`,
      );
    }
  }

  return generateText({
    provider: input.resolved.provider,
    model: input.resolved.model,
    system: "You produce values for the fields of a content archive.",
    prompt: lines.join("\n"),
    imageBase64,
    documentBase64,
    params: input.resolved.params,
  });
}

export class ChatNotConfiguredError extends Error {
  constructor() {
    super("No AI provider is assigned to the Create chat assistant yet. Configure it in Admin → Settings.");
    this.name = "ChatNotConfiguredError";
  }
}

/** Answers a question grounded in retrieved archive snippets. */
export async function runChatAnswer(input: {
  question: string;
  history: { role: "user" | "assistant"; content: string }[];
  contextSnippets: string[];
}): Promise<string> {
  const resolved = await resolveChatProvider();
  if (!resolved) throw new ChatNotConfiguredError();

  const context =
    input.contextSnippets.length > 0
      ? input.contextSnippets.map((s, i) => `[${i + 1}] ${s}`).join("\n\n")
      : "(no relevant archive content found)";

  const historyText = input.history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const prompt = [
    "You are AMPERSAND's Create assistant. Answer the user's question using the",
    "project's archive context below. Ground your answer in it and, where you use",
    "a snippet, reference it like [1]. If the context is insufficient, say so.",
    "",
    "Archive context:",
    context,
    "",
    historyText ? `Conversation so far:\n${historyText}\n` : "",
    `User: ${input.question}`,
  ].join("\n");

  return generateText({
    provider: resolved.provider,
    model: resolved.model,
    system: "You are a grounded, concise content assistant.",
    prompt,
  });
}
