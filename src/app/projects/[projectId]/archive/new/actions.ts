"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { listFields } from "@/lib/data/fields";
import {
  createArchiveItem,
  getArchiveFileBytes,
  getArchiveFileSignedUrl,
  getValuesForItems,
  isProjectStoragePath,
  setItemValue,
} from "@/lib/data/archive";
import { resolveSkill } from "@/lib/data/providers";
import { runFieldGeneration, type GenerationSource } from "@/lib/ai/tasks";
import { fetchPageText } from "@/lib/ai/url-source";
import type { FormField, StoredFileMeta } from "@/lib/types";

/** A file already sitting in storage, uploaded by the browser but not yet attached to a saved record. */
export type StagedFile = { path: string; name: string; type: string; thumbPath: string | null };

/**
 * Finds a file-type source field's file in storage: a just-uploaded one sent
 * by the client (create flow) or the one saved on the record (edit flow).
 */
async function resolveSourceFile(
  projectId: string,
  sourceField: FormField,
  stagedFiles: Record<string, StagedFile> | undefined,
  itemId: string | undefined,
): Promise<GenerationSource | null> {
  let ref: { path: string; name: string; type: string } | null = stagedFiles?.[sourceField.id] ?? null;

  if (!ref && itemId) {
    const valuesByItem = await getValuesForItems([itemId]);
    const value = valuesByItem[itemId]?.find((v) => v.field_id === sourceField.id);
    if (value?.value_text) {
      const meta = (value.value_jsonb ?? {}) as StoredFileMeta;
      ref = { path: value.value_text, name: meta.name ?? "file", type: meta.type ?? "application/octet-stream" };
    }
  }
  if (!ref) return null;
  if (!isProjectStoragePath(projectId, ref.path)) throw new Error("Invalid file reference.");

  // Audio/video can be hundreds of MB, so it's handed over as a link rather than loaded into memory.
  if (ref.type.startsWith("audio/") || ref.type.startsWith("video/")) {
    const url = await getArchiveFileSignedUrl(ref.path);
    if (!url) throw new Error("The uploaded file could not be read from storage.");
    return { kind: "media", name: ref.name, url };
  }

  const data = await getArchiveFileBytes(ref.path);
  if (!data) throw new Error("The uploaded file could not be read from storage.");
  return { kind: "file", name: ref.name, mediaType: ref.type, data };
}

/** Reads `key` out of a source field's JSON content. Arrays are joined with commas; no model call. */
function extractJsonValue(sourceText: string, key: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(sourceText);
  } catch {
    throw new Error("The source field doesn't contain valid JSON.");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("The source field's JSON isn't an object.");
  }
  const value = (parsed as Record<string, unknown>)[key];
  if (value === undefined) throw new Error(`Key "${key}" was not found in the JSON.`);
  if (value === null) return "";
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Generates automated fields. Each field is self-describing: its source
 * (what to read), data type + options (the output format), and either a
 * prompt + skill (an AI call) or a JSON key (a free, deterministic read out
 * of the source's content, added for JSON-consolidation fields). Problems
 * are reported per field in `errors` rather than written into the value, so
 * a failure can never be saved as if it were content.
 */
export async function generateAutomatedFieldsAction(input: {
  projectId: string;
  /** Every field's current value, manual or already-generated, keyed by field id — a field's source can be either. */
  knownValues: Record<string, string>;
  /** Files already uploaded in the create flow (before a record exists), keyed by source field id. */
  stagedFiles?: Record<string, StagedFile>;
  /** When editing an existing item, lets file sources be read from its saved files. */
  itemId?: string;
  /** Which automated fields to (re)generate. Omit for all of them. */
  fieldIds?: string[];
}): Promise<{ values: Record<string, string>; errors: Record<string, string> }> {
  const fields = await listFields(input.projectId);
  const fieldsById = Object.fromEntries(fields.map((f) => [f.id, f]));
  const automated = fields.filter(
    (f) => f.input_type === "automated" && (!input.fieldIds || input.fieldIds.includes(f.id)),
  );

  const values: Record<string, string> = {};
  const errors: Record<string, string> = {};
  await Promise.all(
    automated.map(async (f) => {
      try {
        let source: GenerationSource | undefined;
        const sourceField = f.automation_source_field_id
          ? fieldsById[f.automation_source_field_id]
          : undefined;
        if (sourceField) {
          if (sourceField.data_type === "file") {
            const file = await resolveSourceFile(input.projectId, sourceField, input.stagedFiles, input.itemId);
            if (!file) throw new Error(`Upload a file in "${sourceField.name}" first.`);
            source = file;
          } else {
            const text = (input.knownValues[sourceField.id] ?? "").trim();
            if (!text) throw new Error(`"${sourceField.name}" is empty.`);
            // Models can't browse, so a link's page is fetched here and handed over as text.
            const content = sourceField.data_type === "url" ? await fetchPageText(text) : text;
            source = { kind: "text", text: sourceField.data_type === "url" ? `URL: ${text}\n\n${content}` : content };
          }
        }

        if (f.automation_kind === "json_extract") {
          if (!source) throw new Error("This field needs a source field holding the JSON to read.");
          if (source.kind !== "text") throw new Error("JSON extraction needs a text source, not a file.");
          const key = f.automation_json_key?.trim();
          if (!key) throw new Error("No JSON key is configured for this field.");
          values[f.id] = extractJsonValue(source.text, key);
          return;
        }

        const prompt = f.automation_prompt?.trim() ?? "";
        if (!f.skill_id) throw new Error("No skill is selected for this field.");
        const resolved = await resolveSkill(f.skill_id);
        if (!resolved) {
          throw new Error("Its skill has no provider and model set — configure it in Admin → Settings.");
        }

        // Transcription writes the transcript as-is; every other kind needs the prompt to know what to write.
        if (!prompt && resolved.kind !== "transcription") {
          throw new Error("This field has no prompt — add one in the Form Builder.");
        }

        values[f.id] = await runFieldGeneration({
          fieldName: f.name,
          prompt,
          dataType: f.data_type,
          options: f.options,
          source,
          resolved,
        });
      } catch (e) {
        errors[f.id] = (e as Error).message;
      }
    }),
  );
  return { values, errors };
}

export async function createArchiveItemAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) throw new Error("Missing project id");

  const valuesRaw = String(formData.get("values") ?? "{}");
  const values = JSON.parse(valuesRaw) as Record<string, string>;
  const titleInput = String(formData.get("title") ?? "").trim();

  // Files were uploaded straight to storage as they were picked; only their
  // references arrive here.
  const stagedFiles = JSON.parse(String(formData.get("files") ?? "{}")) as Record<string, StagedFile>;
  for (const file of Object.values(stagedFiles)) {
    if (!isProjectStoragePath(projectId, file.path)) throw new Error("Invalid file reference.");
  }

  const fields = await listFields(projectId);

  // Default the title to the uploaded file's original name when the user
  // left it blank.
  const fileField = fields.find((f) => f.data_type === "file" && stagedFiles[f.id]);
  const fallbackTitle = fileField ? stagedFiles[fileField.id].name : null;

  const item = await createArchiveItem({ projectId, title: titleInput || fallbackTitle });

  await Promise.all(
    fields.map(async (f) => {
      if (f.data_type === "file") {
        const file = stagedFiles[f.id];
        if (file) {
          const meta: StoredFileMeta = { name: file.name, type: file.type, thumbPath: file.thumbPath };
          await setItemValue({ itemId: item.id, fieldId: f.id, valueText: file.path, valueJsonb: meta });
        }
        return;
      }

      const raw = values[f.id];
      if (raw === undefined || raw === "") return;

      if (f.data_type === "tags" || f.data_type === "multi_select") {
        const arr = raw.split(",").map((s) => s.trim()).filter(Boolean);
        await setItemValue({
          itemId: item.id,
          fieldId: f.id,
          valueText: arr.join(", "),
          valueJsonb: arr,
        });
      } else {
        await setItemValue({ itemId: item.id, fieldId: f.id, valueText: raw });
      }
    }),
  );

  revalidatePath(`/projects/${projectId}/archive`);
  redirect(`/projects/${projectId}/archive/${item.id}`);
}
