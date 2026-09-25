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
import { isNewDraftId, missingJsonKeyMessage, missingSkillMessage, type DraftFieldInput } from "./draft";

// Persists the whole form in one go: creates, updates, and deletes are
// diffed against the current DB state, and the incoming array order
// becomes the new sort_order. A new field can reference another new
// field as its automation source (a forward reference to a row that
// doesn't have a real id yet), so ids are resolved in two passes.
//
// Validation problems come back as `{ error }` rather than being thrown, so
// the form can show them inline instead of crashing into the error overlay.
export async function saveFormAction(
  projectId: string,
  draftFields: DraftFieldInput[],
): Promise<{ error: string } | undefined> {
  if (!projectId) throw new Error("Project is required");

  for (const f of draftFields) {
    if (!f.name.trim() || !f.dataType) {
      return { error: "Every field needs a name and a data type" };
    }
  }
  const missingSkill = draftFields.filter(
    (f) => f.inputType === "automated" && f.automationKind === "ai" && !f.skillId,
  );
  if (missingSkill.length > 0) {
    return { error: missingSkillMessage(missingSkill.map((f) => f.name)) };
  }
  const missingJsonKey = draftFields.filter(
    (f) => f.inputType === "automated" && f.automationKind === "json_extract" && !f.automationJsonKey?.trim(),
  );
  if (missingJsonKey.length > 0) {
    return { error: missingJsonKeyMessage(missingJsonKey.map((f) => f.name)) };
  }

  const existing = await listFields(projectId);
  const incomingIds = new Set(draftFields.filter((f) => !isNewDraftId(f.id)).map((f) => f.id));

  const toDelete = existing.filter((f) => !incomingIds.has(f.id));
  await Promise.all(toDelete.map((f) => deleteField(f.id)));

  const idMap = new Map<string, string>();
  const deferred: { realId: string; tempSourceId: string }[] = [];

  for (let i = 0; i < draftFields.length; i++) {
    const f = draftFields[i];
    const sourceIsTemp = f.automationSourceFieldId ? isNewDraftId(f.automationSourceFieldId) : false;
    const resolvedSource = f.automationSourceFieldId
      ? sourceIsTemp
        ? (idMap.get(f.automationSourceFieldId) ?? null)
        : f.automationSourceFieldId
      : null;
    const sourceStillPending = sourceIsTemp && resolvedSource === null;

    if (isNewDraftId(f.id)) {
      const created = await createField({
        projectId,
        name: f.name,
        dataType: f.dataType,
        options: f.options,
        inputType: f.inputType,
        automationSourceFieldId: sourceStillPending ? null : resolvedSource,
        automationPrompt: f.automationPrompt,
        skillId: f.inputType === "automated" ? f.skillId : null,
        automationKind: f.automationKind,
        automationJsonKey: f.automationJsonKey,
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
        skillId: f.inputType === "automated" ? f.skillId : null,
        automationKind: f.automationKind,
        automationJsonKey: f.automationJsonKey,
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
