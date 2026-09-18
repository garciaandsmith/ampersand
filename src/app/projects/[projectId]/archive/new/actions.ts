"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { listFields } from "@/lib/data/fields";
import {
  createArchiveItem,
  getArchiveFileBase64,
  getValuesForItems,
  setItemValue,
  uploadArchiveFile,
} from "@/lib/data/archive";
import { resolveFieldAutomationProvider } from "@/lib/data/providers";
import {
  runDocumentParsing,
  runFieldAutomation,
  runImageRecognition,
  runSummaryGeneration,
} from "@/lib/ai/tasks";
import type { FormField } from "@/lib/types";

type FilePayload = { name: string; type: string; dataBase64: string };

/**
 * Locates the file bytes a file-sourced skill (image_recognition,
 * document_parsing) needs: either a not-yet-uploaded file passed straight
 * from the browser (create flow, before the item/file exists in storage),
 * or an already-uploaded file fetched from storage (edit flow, via itemId).
 */
async function resolveSourceFile(
  sourceField: FormField,
  manualFiles: Record<string, FilePayload> | undefined,
  itemId: string | undefined,
): Promise<FilePayload | null> {
  const provided = manualFiles?.[sourceField.id];
  if (provided) return provided;
  if (!itemId) return null;

  const valuesByItem = await getValuesForItems([itemId]);
  const value = valuesByItem[itemId]?.find((v) => v.field_id === sourceField.id);
  if (!value?.value_text) return null;

  const meta = value.value_jsonb as { name?: string; type?: string } | undefined;
  const dataBase64 = await getArchiveFileBase64(value.value_text);
  if (!dataBase64) return null;

  return { name: meta?.name ?? "file", type: meta?.type ?? "application/octet-stream", dataBase64 };
}

export async function generateAutomatedFieldsAction(input: {
  projectId: string;
  manualValues: Record<string, string>;
  /** Not-yet-saved files, base64-encoded client-side, keyed by source field id — used by the create flow before an item exists. */
  manualFiles?: Record<string, FilePayload>;
  /** When editing an existing item, lets file-sourced skills fetch the already-uploaded file from storage. */
  itemId?: string;
  /** When set, only this field is (re)generated instead of every automated field. */
  fieldId?: string;
}): Promise<Record<string, string>> {
  const fields = await listFields(input.projectId);
  const fieldsById = Object.fromEntries(fields.map((f) => [f.id, f]));
  const automated = fields.filter(
    (f) => f.input_type === "automated" && (!input.fieldId || f.id === input.fieldId),
  );

  const results: Record<string, string> = {};
  await Promise.all(
    automated.map(async (f) => {
      const skill = f.skill_key ?? "field_automation";
      try {
        const resolved = (await resolveFieldAutomationProvider(f)) ?? undefined;

        if (skill === "image_recognition" || skill === "document_parsing") {
          const sourceField = f.automation_source_field_id
            ? fieldsById[f.automation_source_field_id]
            : null;
          if (!sourceField || sourceField.data_type !== "file") return;

          const file = await resolveSourceFile(sourceField, input.manualFiles, input.itemId);
          if (!file) return;

          const prompt =
            f.automation_prompt?.trim() ||
            (skill === "image_recognition"
              ? "Describe this image factually for a content archive record."
              : "Extract and summarize this document's key content for a content archive record.");

          results[f.id] =
            skill === "image_recognition"
              ? await runImageRecognition({
                  imageBase64: file.dataBase64,
                  mediaType: file.type,
                  prompt,
                  resolved,
                })
              : await runDocumentParsing({
                  documentBase64: file.dataBase64,
                  mediaType: file.type,
                  prompt,
                  resolved,
                });
          return;
        }

        if (skill === "summary_generation") {
          const sourceValue = f.automation_source_field_id
            ? input.manualValues[f.automation_source_field_id] ?? ""
            : "";
          if (!sourceValue.trim()) return;
          results[f.id] = await runSummaryGeneration({
            fieldName: f.name,
            sourceValue,
            instructions: f.automation_prompt ?? undefined,
            resolved,
          });
          return;
        }

        // field_automation (also the fallback for any legacy field with no skill_key set)
        if (!f.automation_source_field_id || !f.automation_prompt) return;
        const sourceValue = input.manualValues[f.automation_source_field_id] ?? "";
        if (!sourceValue.trim()) return;
        results[f.id] = await runFieldAutomation({
          fieldName: f.name,
          automationPrompt: f.automation_prompt,
          sourceValue,
          resolved,
        });
      } catch (e) {
        results[f.id] = `[Could not generate: ${(e as Error).message}]`;
      }
    }),
  );
  return results;
}

export async function createArchiveItemAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) throw new Error("Missing project id");

  const valuesRaw = String(formData.get("values") ?? "{}");
  const values = JSON.parse(valuesRaw) as Record<string, string>;
  const titleInput = String(formData.get("title") ?? "").trim();

  const fields = await listFields(projectId);

  // Default the title to the uploaded file's original name when the user
  // left it blank.
  const fileField = fields.find((f) => f.data_type === "file");
  const uploadedFile = fileField ? formData.get(`file:${fileField.id}`) : null;
  const fallbackTitle = uploadedFile instanceof File && uploadedFile.size > 0 ? uploadedFile.name : null;

  const item = await createArchiveItem({ projectId, title: titleInput || fallbackTitle });

  await Promise.all(
    fields.map(async (f) => {
      if (f.data_type === "file") {
        const file = formData.get(`file:${f.id}`);
        if (file instanceof File && file.size > 0) {
          const uploaded = await uploadArchiveFile(projectId, file);
          await setItemValue({
            itemId: item.id,
            fieldId: f.id,
            valueText: uploaded.path,
            valueJsonb: { name: file.name, type: file.type },
          });
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
