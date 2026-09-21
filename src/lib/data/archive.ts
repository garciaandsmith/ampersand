import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { listFields } from "@/lib/data/fields";
import type { ArchiveItem, ArchiveItemValue, StoredFileMeta } from "@/lib/types";

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
  title?: string | null;
  filePath?: string | null;
  fileName?: string | null;
  fileType?: string | null;
}): Promise<ArchiveItem> {
  const { data, error } = await supabaseAdmin()
    .from("archive_items")
    .insert({
      project_id: input.projectId,
      title: input.title ?? null,
      file_path: input.filePath ?? null,
      file_name: input.fileName ?? null,
      file_type: input.fileType ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateArchiveItemTitle(id: string, title: string | null): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("archive_items")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteArchiveItem(id: string): Promise<void> {
  const item = await getArchiveItem(id);
  const paths = item ? await listItemFilePaths(item) : [];
  const { error } = await supabaseAdmin().from("archive_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await removeArchiveFiles(paths);
}

/** Every storage object an item owns: the legacy single file plus each file field's upload and thumbnail. */
async function listItemFilePaths(item: ArchiveItem): Promise<string[]> {
  const paths = new Set<string>();
  if (item.file_path) paths.add(item.file_path);

  const [fields, valuesByItem] = await Promise.all([listFields(item.project_id), getValuesForItems([item.id])]);
  const fileFieldIds = new Set(fields.filter((f) => f.data_type === "file").map((f) => f.id));
  for (const v of valuesByItem[item.id] ?? []) {
    if (!fileFieldIds.has(v.field_id)) continue;
    if (v.value_text) paths.add(v.value_text);
    const thumbPath = (v.value_jsonb as StoredFileMeta | null)?.thumbPath;
    if (thumbPath) paths.add(thumbPath);
  }
  return [...paths];
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

/** True when `path` sits inside this project's folder of the archive bucket. */
export function isProjectStoragePath(projectId: string, path: string): boolean {
  return path.startsWith(`${projectId}/`) && !path.includes("..");
}

/**
 * Mints one-time signed upload tokens so the browser can send a file (and its
 * thumbnail) straight to storage. Going through a server action instead would
 * hit Next.js's request-body limit (1 MB by default) and Vercel's (~4.5 MB),
 * which rules out audio/video.
 */
export async function createUploadTargets(
  projectId: string,
  fileName: string,
  withThumbnail: boolean,
): Promise<{
  file: { path: string; token: string };
  thumb: { path: string; token: string } | null;
}> {
  const rawExt = fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase() : "";
  const ext = /^[a-z0-9]{1,8}$/.test(rawExt) ? `.${rawExt}` : "";
  const base = `${projectId}/${crypto.randomUUID()}`;
  const bucket = supabaseAdmin().storage.from("archive");

  const sign = async (path: string) => {
    const { data, error } = await bucket.createSignedUploadUrl(path);
    if (error || !data) throw new Error(error?.message ?? "Could not create an upload URL.");
    return { path, token: data.token };
  };

  const file = await sign(`${base}${ext}`);
  const thumb = withThumbnail ? await sign(`${base}.thumb.jpg`) : null;
  return { file, thumb };
}

export async function removeArchiveFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await supabaseAdmin().storage.from("archive").remove(paths);
}

export async function getArchiveFileSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .storage.from("archive")
    .createSignedUrl(path, 60 * 60);

  if (error) return null;
  return data.signedUrl;
}

/** Downloads an archive file's bytes so an AI skill can read them. */
export async function getArchiveFileBytes(path: string): Promise<Buffer | null> {
  const { data, error } = await supabaseAdmin().storage.from("archive").download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}
