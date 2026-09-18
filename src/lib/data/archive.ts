import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { ArchiveItem, ArchiveItemValue } from "@/lib/types";

export async function listArchiveItems(projectId: string): Promise<ArchiveItem[]> {
  const { data, error } = await supabaseAdmin()
    .from("archive_items")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getArchiveItem(id: string): Promise<ArchiveItem | null> {
  const { data, error } = await supabaseAdmin()
    .from("archive_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getValuesForItems(
  itemIds: string[],
): Promise<Record<string, ArchiveItemValue[]>> {
  if (itemIds.length === 0) return {};
  const { data, error } = await supabaseAdmin()
    .from("archive_item_values")
    .select("*")
    .in("item_id", itemIds);

  if (error) throw new Error(error.message);

  const byItem: Record<string, ArchiveItemValue[]> = {};
  for (const v of data) {
    (byItem[v.item_id] ??= []).push(v);
  }
  return byItem;
}

export async function createArchiveItem(input: {
  projectId: string;
  filePath?: string | null;
  fileName?: string | null;
  fileType?: string | null;
}): Promise<ArchiveItem> {
  const { data, error } = await supabaseAdmin()
    .from("archive_items")
    .insert({
      project_id: input.projectId,
      file_path: input.filePath ?? null,
      file_name: input.fileName ?? null,
      file_type: input.fileType ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteArchiveItem(id: string): Promise<void> {
  const item = await getArchiveItem(id);
  const { error } = await supabaseAdmin().from("archive_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (item?.file_path) {
    await supabaseAdmin().storage.from("archive").remove([item.file_path]);
  }
}

export async function setItemValue(input: {
  itemId: string;
  fieldId: string;
  valueText?: string | null;
  valueJsonb?: unknown | null;
}): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("archive_item_values")
    .upsert(
      {
        item_id: input.itemId,
        field_id: input.fieldId,
        value_text: input.valueText ?? null,
        value_jsonb: input.valueJsonb ?? null,
      },
      { onConflict: "item_id,field_id" },
    );

  if (error) throw new Error(error.message);
}

export async function uploadArchiveFile(
  projectId: string,
  file: File,
): Promise<{ path: string }> {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
  const path = `${projectId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

  const { error } = await supabaseAdmin()
    .storage.from("archive")
    .upload(path, file, { contentType: file.type || undefined });

  if (error) throw new Error(error.message);
  return { path };
}

export async function getArchiveFileSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .storage.from("archive")
    .createSignedUrl(path, 60 * 60);

  if (error) return null;
  return data.signedUrl;
}
