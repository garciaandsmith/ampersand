"use server";

import { revalidatePath } from "next/cache";
import {
  createField,
  deleteField,
  listFields,
  updateField,
  updateFieldAutomationSource,
  updateFieldOrder,
} from "@/lib/data/fields";
import type { FieldDataType, InputType } from "@/lib/types";

export type DraftFieldInput = {
  id: string;
  name: string;
  dataType: FieldDataType;
  options: string[] | null;
  inputType: InputType;
  automationSourceFieldId: string | null;
  automationPrompt: string | null;
};

const isNewId = (id: string) => id.startsWith("new:");

// Persists the whole form in one go: creates, updates, and deletes are
// diffed against the current DB state, and the incoming array order
// becomes the new sort_order. A new field can reference another new
// field as its automation source (a forward reference to a row that
// doesn't have a real id yet), so ids are resolved in two passes.
export async function saveFormAction(projectId: string, draftFields: DraftFieldInput[]) {
  if (!projectId) throw new Error("Project is required");

  for (const f of draftFields) {
    if (!f.name.trim() || !f.dataType) {
      throw new Error("Every field needs a name and a data type");
    }
    if (f.inputType === "automated" && (!f.automationSourceFieldId || !f.automationPrompt?.trim())) {
      throw new Error("Automated fields need a source field and a prompt");
    }
  }

  const existing = await listFields(projectId);
  const incomingIds = new Set(draftFields.filter((f) => !isNewId(f.id)).map((f) => f.id));

  const toDelete = existing.filter((f) => !incomingIds.has(f.id));
  await Promise.all(toDelete.map((f) => deleteField(f.id)));

  const idMap = new Map<string, string>();
  const deferred: { realId: string; tempSourceId: string }[] = [];

  for (let i = 0; i < draftFields.length; i++) {
    const f = draftFields[i];
    const sourceIsTemp = f.automationSourceFieldId ? isNewId(f.automationSourceFieldId) : false;
    const resolvedSource = f.automationSourceFieldId
      ? sourceIsTemp
        ? (idMap.get(f.automationSourceFieldId) ?? null)
        : f.automationSourceFieldId
      : null;
    const sourceStillPending = sourceIsTemp && resolvedSource === null;

    if (isNewId(f.id)) {
      const created = await createField({
        projectId,
        name: f.name,
        dataType: f.dataType,
        options: f.options,
        inputType: f.inputType,
        automationSourceFieldId: sourceStillPending ? null : resolvedSource,
        automationPrompt: f.automationPrompt,
        sortOrder: i,
      });
      idMap.set(f.id, created.id);
      if (sourceStillPending) {
        deferred.push({ realId: created.id, tempSourceId: f.automationSourceFieldId! });
      }
    } else {
      await updateField(f.id, {
        name: f.name,
        dataType: f.dataType,
        options: f.options,
        inputType: f.inputType,
        automationSourceFieldId: sourceStillPending ? null : resolvedSource,
        automationPrompt: f.automationPrompt,
      });
      await updateFieldOrder(f.id, i);
      if (sourceStillPending) {
        deferred.push({ realId: f.id, tempSourceId: f.automationSourceFieldId! });
      }
    }
  }

  for (const d of deferred) {
    const resolved = idMap.get(d.tempSourceId);
    if (resolved) {
      await updateFieldAutomationSource(d.realId, resolved);
    }
  }

  revalidatePath(`/projects/${projectId}/form-builder`);
}
