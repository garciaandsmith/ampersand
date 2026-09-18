import "server-only";
import { resolveSkillProvider } from "@/lib/data/providers";
import { generateText } from "@/lib/ai/client";
import type { AiProvider } from "@/lib/types";

type Resolved = { provider: AiProvider; model: string };

export class SkillNotConfiguredError extends Error {
  constructor(skillKey: string) {
    super(
      `No AI provider is assigned to the "${skillKey}" skill yet. Configure it in Admin → Settings.`,
    );
    this.name = "SkillNotConfiguredError";
  }
}

/**
 * Runs the "field_automation" skill: fills one automated form field from an
 * input value + prompt. `resolved` lets a caller pass a per-field
 * provider/model override; otherwise this resolves the skill's default from
 * Admin > Settings.
 */
export async function runFieldAutomation(input: {
  fieldName: string;
  automationPrompt: string;
  sourceValue: string;
  resolved?: Resolved;
}): Promise<string> {
  const resolved = input.resolved ?? (await resolveSkillProvider("field_automation"));
  if (!resolved) throw new SkillNotConfiguredError("field_automation");

  const prompt = [
    `You are filling in the "${input.fieldName}" field of a content archive record.`,
    `Instruction: ${input.automationPrompt}`,
    "",
    "Source content:",
    input.sourceValue,
    "",
    "Respond with only the value for the field — no preamble, no explanation.",
  ].join("\n");

  return generateText({
    provider: resolved.provider,
    model: resolved.model,
    system: "You produce concise, structured metadata for a content archive.",
    prompt,
  });
}

/** Runs the "summary_generation" skill: summarizes a text field's content. */
export async function runSummaryGeneration(input: {
  fieldName: string;
  sourceValue: string;
  instructions?: string;
  resolved?: Resolved;
}): Promise<string> {
  const resolved = input.resolved ?? (await resolveSkillProvider("summary_generation"));
  if (!resolved) throw new SkillNotConfiguredError("summary_generation");

  const prompt = [
    `You are writing the "${input.fieldName}" field of a content archive record — a summary.`,
    input.instructions ? `Instruction: ${input.instructions}` : "Write a concise summary.",
    "",
    "Source content:",
    input.sourceValue,
    "",
    "Respond with only the summary — no preamble, no explanation.",
  ].join("\n");

  return generateText({
    provider: resolved.provider,
    model: resolved.model,
    system: "You write concise, accurate summaries for a content archive.",
    prompt,
  });
}

/** Runs the "image_recognition" skill: describes an uploaded image. */
export async function runImageRecognition(input: {
  imageBase64: string;
  mediaType: string;
  prompt: string;
  resolved?: Resolved;
}): Promise<string> {
  const resolved = input.resolved ?? (await resolveSkillProvider("image_recognition"));
  if (!resolved) throw new SkillNotConfiguredError("image_recognition");

  return generateText({
    provider: resolved.provider,
    model: resolved.model,
    system: "You describe images clearly and factually for a content archive.",
    prompt: input.prompt,
    imageBase64: { mediaType: input.mediaType, data: input.imageBase64 },
  });
}

/**
 * Runs the "document_parsing" skill: extracts/summarizes an uploaded
 * document's content. Only PDFs are supported today, and only when the
 * skill resolves to an Anthropic provider (native PDF input, no extra
 * library). DOCX and other non-PDF formats, and PDF-via-OpenAI, need a
 * text-extraction library (e.g. `pdf-parse`) or the OpenAI Files API — not
 * added here; see generateText()'s documentBase64 handling.
 */
export async function runDocumentParsing(input: {
  documentBase64: string;
  mediaType: string;
  prompt: string;
  resolved?: Resolved;
}): Promise<string> {
  const resolved = input.resolved ?? (await resolveSkillProvider("document_parsing"));
  if (!resolved) throw new SkillNotConfiguredError("document_parsing");

  if (input.mediaType !== "application/pdf") {
    throw new Error(
      `Document parsing only supports PDF files right now (got "${input.mediaType}"). Extracting text from other formats needs a parsing library (e.g. mammoth for .docx) — none is wired up yet.`,
    );
  }

  return generateText({
    provider: resolved.provider,
    model: resolved.model,
    system: "You extract and summarize the content of documents for a content archive.",
    prompt: input.prompt,
    documentBase64: { mediaType: "application/pdf", data: input.documentBase64 },
  });
}

/** Runs the "text_generation" skill: answers a question grounded in retrieved archive snippets. */
export async function runChatAnswer(input: {
  question: string;
  history: { role: "user" | "assistant"; content: string }[];
  contextSnippets: string[];
}): Promise<string> {
  const resolved = await resolveSkillProvider("text_generation");
  if (!resolved) throw new SkillNotConfiguredError("text_generation");

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
