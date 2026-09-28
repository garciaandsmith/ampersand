import { listChatMessages } from "@/lib/data/chat";
import { ChatClient } from "./ChatClient";

export default async function CreatePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const messages = await listChatMessages(projectId);

  return (
    <div>
      <h2 className="mb-1 font-sans text-base font-extrabold">Create</h2>
      <p className="mb-6 max-w-2xl text-sm text-charcoal/60">
        A chat interface grounded in this project&rsquo;s Archive — ask questions,
        request summaries, or generate new content from what&rsquo;s already known.
      </p>
      <ChatClient projectId={projectId} initialMessages={messages} />
    </div>
  );
}
