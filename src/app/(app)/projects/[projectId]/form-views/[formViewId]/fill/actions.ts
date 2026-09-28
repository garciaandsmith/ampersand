"use server";

import { revalidatePath } from "next/cache";
import { requireProjectRoleAction } from "@/lib/auth/session";
import { createArchiveItem, isProjectStoragePath, setItemValue } from "@/lib/data/archive";
import { getFormViewWithFields, recordFormViewSubmission } from "@/lib/data/formViews";
import type { StagedFile } from "../../../archive/new/actions";

export type { StagedFile };

/**
 * Creates a new archive item from a Form View submission, scoped to just
 * that view's fields. Unlike the full "New archive record" flow this never
 * redirects — the mobile fill screen returns the new item's id and stays put,
 * so the same person can log several records in a row.
 */
export async function submitFormViewAction(input: {
  projectId: string;
  formViewId: string;
  values: Record<string, string>;
  files: Record<string, StagedFile>;
}): Promise<{ error: string } | { itemId: string }> {
  const user = await requireProjectRoleAction(input.projectId, "editor");

  const viewWithFields = await getFormViewWithFields(input.formViewId);
  if (!viewWithFields || viewWithFields.view.project_id !== input.projectId) {
    return { error: "This Form View no longer exists." };
  }

  for (const file of Object.values(input.files)) {
    if (!isProjectStoragePath(input.projectId, file.path)) throw new Error("Invalid file reference.");
  }

  const title = `${viewWithFields.view.name} — ${new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;

  const item = await createArchiveItem({ projectId: input.projectId, title });

  await Promise.all(
    viewWithFields.fields.map(async (f) => {
      if (f.data_type === "file") {
        const file = input.files[f.id];
        if (file) {
          await setItemValue({
            itemId: item.id,
            fieldId: f.id,
            valueText: file.path,
            valueJsonb: { name: file.name, type: file.type, thumbPath: file.thumbPath },
          });
        }
        return;
      }

      const raw = input.values[f.id];
      if (raw === undefined || raw === "") return;

      if (f.data_type === "tags" || f.data_type === "multi_select") {
        const arr = raw.split(",").map((s) => s.trim()).filter(Boolean);
        await setItemValue({ itemId: item.id, fieldId: f.id, valueText: arr.join(", "), valueJsonb: arr });
      } else {
        await setItemValue({ itemId: item.id, fieldId: f.id, valueText: raw });
      }
    }),
  );

  await recordFormViewSubmission({ formViewId: input.formViewId, archiveItemId: item.id, createdBy: user.id });

  revalidatePath(`/projects/${input.projectId}/archive`);
  return { itemId: item.id };
}
