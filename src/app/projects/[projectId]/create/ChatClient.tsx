"use client";

import { useState, useTransition } from "react";
import type { ChatMessage } from "@/lib/types";
import { Badge, Button, Textarea } from "@/components/ui";
import { sendMessageAction } from "./actions";

export function ChatClient({
  projectId,
  initialMessages,
}: {
  projectId: string;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, startSending] = useTransition();

  function handleSend() {
    const q = question.trim();
    if (!q) return;
    setError(null);
    setQuestion("");
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        project_id: projectId,
        role: "user",
        content: q,
        sources: null,
        created_at: new Date().toISOString(),
      },
    ]);

    startSending(async () => {
      try {
        const assistantMessage = await sendMessageAction({ projectId, question: q });
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-220px)] flex-col rounded border border-charcoal">
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <p className="text-sm text-charcoal/50">
            Ask a question, request a summary, or ask for a new piece of content —
            answers are grounded in this project&rsquo;s Archive.
          </p>
        ) : null}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-2xl rounded px-4 py-3 text-sm ${
              m.role === "user"
                ? "ml-auto bg-charcoal text-paper"
                : "border border-teal/40 bg-teal/10 text-charcoal"
            }`}
          >
            <div className="whitespace-pre-wrap">{m.content}</div>
            {m.sources && m.sources.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {m.sources.map((s, i) => (
                  <Badge key={`${s.item_id}-${i}`} color="charcoal">
                    [{i + 1}]
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {isSending ? (
          <div className="max-w-2xl rounded border border-teal/40 bg-teal/10 px-4 py-3 text-sm text-charcoal/50">
            Thinking…
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="border-t border-coral/40 bg-coral/10 px-4 py-2 text-sm text-coral">
          {error}
        </p>
      ) : null}

      <div className="flex items-end gap-2 border-t border-charcoal/15 p-4">
        <Textarea
          rows={2}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask AMPERSAND about this project…"
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={isSending || !question.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}
