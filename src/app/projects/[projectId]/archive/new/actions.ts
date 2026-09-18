"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { listFields } from "@/lib/data/fields";
import { createArchiveItem, setItemValue, uploadArchiveFile } from "@/lib/data/archive";
import { runFieldAutomation } from "@/lib/ai/tasks";

export async function generateAutomatedFieldsAction(input: {
  projectId: string;
  manualValues: Record<string, string>;
  /** When set, only this field is (re)generated instead of every automated field. */
  fieldId?: string;
}): Promise<Record<string, string>> {
  const fields = await listFields(input.projectId);
  const automated = fields.filter(
    (f) => f.input_type === "automated" && (!input.fieldId || f.id === input.fieldId),
  );

  const results: Record<string, string> = {};
  await Promise.all(
    automated.map(async (f) => {
      if (!f.automation_source_field_id || !f.automation_prompt) return;
      const sourceValue = input.manualValues[f.automation_source_field_id] ?? "";
      if (!sourceValue.trim()) return;
      try {
        results[f.id] = await runFieldAutomation({
          fieldName: f.name,
          automationPrompt: f.automation_prompt,
          sourceValue,
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

  const item = await createArchiveItem({ projectId });
  const fields = await listFields(projectId);

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
