"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteArchiveItem, setItemValue } from "@/lib/data/archive";
import { listFields } from "@/lib/data/fields";

export async function updateArchiveItemAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const valuesRaw = String(formData.get("values") ?? "{}");
  const values = JSON.parse(valuesRaw) as Record<string, string>;

  if (!projectId || !itemId) throw new Error("Missing project or item id");

  const fields = await listFields(projectId);
  await Promise.all(
    fields.map(async (f) => {
      const raw = values[f.id];
      if (raw === undefined) return;

      if (f.data_type === "tags" || f.data_type === "multi_select") {
        const arr = raw.split(",").map((s) => s.trim()).filter(Boolean);
        await setItemValue({
          itemId,
          fieldId: f.id,
          valueText: arr.join(", "),
          valueJsonb: arr.length ? arr : null,
        });
      } else {
        await setItemValue({ itemId, fieldId: f.id, valueText: raw || null });
      }
    }),
  );

  revalidatePath(`/projects/${projectId}/archive/${itemId}`);
}

export async function deleteArchiveItemAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  if (!projectId || !itemId) throw new Error("Missing project or item id");

  await deleteArchiveItem(itemId);
  revalidatePath(`/projects/${projectId}/archive`);
  redirect(`/projects/${projectId}/archive`);
}
