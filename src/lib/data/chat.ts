import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { ChatMessage } from "@/lib/types";

export async function listChatMessages(projectId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabaseAdmin()
    .from("chat_messages")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function addChatMessage(input: {
  projectId: string;
  role: "user" | "assistant";
  content: string;
  sources?: { item_id: string; snippet: string }[] | null;
}): Promise<ChatMessage> {
  const { data, error } = await supabaseAdmin()
    .from("chat_messages")
    .insert({
      project_id: input.projectId,
      role: input.role,
      content: input.content,
      sources: input.sources ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Naive retrieval for the Create chat: full-text search over archive field
 * values for this project, falling back to the most recent items when the
 * query has no matches. This is a stand-in for real embeddings-based RAG
 * (see AGENTS.md Phase 3) — good enough to ground answers in archive content
 * without standing up a vector pipeline for the prototype.
 */
export async function searchArchiveContent(
  projectId: string,
  query: string,
  limit = 6,
): Promise<{ item_id: string; snippet: string }[]> {
  const admin = supabaseAdmin();

  const { data: items, error: itemsError } = await admin
    .from("archive_items")
    .select("id")
    .eq("project_id", projectId);
  if (itemsError) throw new Error(itemsError.message);
  const itemIds = items.map((i) => i.id);
  if (itemIds.length === 0) return [];

  const words = query
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 8);
  const tsQuery = words.join(" | ") || query;

  const { data: matches, error: matchError } = await admin
    .from("archive_item_values")
    .select("item_id, value_text")
    .in("item_id", itemIds)
    .not("value_text", "is", null)
    .textSearch("value_text", tsQuery, { type: "websearch", config: "english" })
    .limit(limit);

  if (matchError) {
    // Fall back to most recent values if the text search query is unparseable.
    const { data: recent } = await admin
      .from("archive_item_values")
      .select("item_id, value_text")
      .in("item_id", itemIds)
      .not("value_text", "is", null)
      .limit(limit);
    return (recent ?? []).map((r) => ({
      item_id: r.item_id,
      snippet: (r.value_text ?? "").slice(0, 400),
    }));
  }

  if (matches.length > 0) {
    return matches.map((m) => ({
      item_id: m.item_id,
      snippet: (m.value_text ?? "").slice(0, 400),
    }));
  }

  const { data: recent } = await admin
    .from("archive_item_values")
    .select("item_id, value_text")
    .in("item_id", itemIds)
    .not("value_text", "is", null)
    .limit(limit);
  return (recent ?? []).map((r) => ({
    item_id: r.item_id,
    snippet: (r.value_text ?? "").slice(0, 400),
  }));
}
