import "server-only";
import { resolveTaskProvider } from "@/lib/data/providers";
import { generateText } from "@/lib/ai/client";

export class TaskNotConfiguredError extends Error {
  constructor(taskKey: string) {
    super(
      `No AI provider is assigned to the "${taskKey}" task yet. Configure it in Admin → Settings.`,
    );
    this.name = "TaskNotConfiguredError";
  }
}

/** Runs the "field_automation" task: fills one automated form field from an input value + prompt. */
export async function runFieldAutomation(input: {
  fieldName: string;
  automationPrompt: string;
  sourceValue: string;
}): Promise<string> {
  const resolved = await resolveTaskProvider("field_automation");
  if (!resolved) throw new TaskNotConfiguredError("field_automation");

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

/** Runs the "visual_recognition" task: describes an uploaded image. */
export async function runVisualRecognition(input: {
  imageBase64: string;
  mediaType: string;
  prompt: string;
}): Promise<string> {
  const resolved = await resolveTaskProvider("visual_recognition");
  if (!resolved) throw new TaskNotConfiguredError("visual_recognition");

  return generateText({
    provider: resolved.provider,
    model: resolved.model,
    system: "You describe images clearly and factually for a content archive.",
    prompt: input.prompt,
    imageBase64: { mediaType: input.mediaType, data: input.imageBase64 },
  });
}

/** Runs the "chat" task: answers a question grounded in retrieved archive snippets. */
export async function runChatAnswer(input: {
  question: string;
  history: { role: "user" | "assistant"; content: string }[];
  contextSnippets: string[];
}): Promise<string> {
  const resolved = await resolveTaskProvider("chat");
  if (!resolved) throw new TaskNotConfiguredError("chat");

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
