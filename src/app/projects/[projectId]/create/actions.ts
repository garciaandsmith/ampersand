"use server";

import { revalidatePath } from "next/cache";
import { addChatMessage, listChatMessages, searchArchiveContent } from "@/lib/data/chat";
import { runChatAnswer } from "@/lib/ai/tasks";
import type { ChatMessage } from "@/lib/types";

export async function sendMessageAction(input: {
  projectId: string;
  question: string;
}): Promise<ChatMessage> {
  const { projectId, question } = input;
  if (!question.trim()) throw new Error("Message is empty");

  await addChatMessage({ projectId, role: "user", content: question });

  const [history, sources] = await Promise.all([
    listChatMessages(projectId),
    searchArchiveContent(projectId, question),
  ]);

  const answer = await runChatAnswer({
    question,
    history: history.map((m) => ({ role: m.role, content: m.content })),
    contextSnippets: sources.map((s) => s.snippet),
  });

  const assistantMessage = await addChatMessage({
    projectId,
    role: "assistant",
    content: answer,
    sources,
  });

  revalidatePath(`/projects/${projectId}/create`);
  return assistantMessage;
}
