"use server";

import { revalidatePath } from "next/cache";
import { createField, deleteField, listFields, updateFieldOrder } from "@/lib/data/fields";
import type { FieldDataType, InputType } from "@/lib/types";

export async function createFieldAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const dataType = String(formData.get("dataType") ?? "") as FieldDataType;
  const inputType = String(formData.get("inputType") ?? "manual") as InputType;
  const automationSourceFieldId =
    String(formData.get("automationSourceFieldId") ?? "") || null;
  const automationPrompt = String(formData.get("automationPrompt") ?? "").trim() || null;
  const optionsRaw = String(formData.get("options") ?? "").trim();
  const options = optionsRaw
    ? optionsRaw.split(",").map((o) => o.trim()).filter(Boolean)
    : null;

  if (!projectId || !name || !dataType) {
    throw new Error("Project, name, and data type are required");
  }
  if (inputType === "automated" && (!automationSourceFieldId || !automationPrompt)) {
    throw new Error("Automated fields need a source field and a prompt");
  }

  const existing = await listFields(projectId);

  await createField({
    projectId,
    name,
    dataType,
    options,
    inputType,
    automationSourceFieldId,
    automationPrompt,
    sortOrder: existing.length,
  });

  revalidatePath(`/projects/${projectId}/form-builder`);
}

export async function deleteFieldAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  if (!id || !projectId) throw new Error("Missing field id or project id");

  await deleteField(id);
  revalidatePath(`/projects/${projectId}/form-builder`);
}

export async function moveFieldAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id || !projectId || (direction !== "up" && direction !== "down")) {
    throw new Error("Missing or invalid reorder parameters");
  }

  const fields = await listFields(projectId);
  const index = fields.findIndex((f) => f.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= fields.length) return;

  const current = fields[index];
  const swapWith = fields[swapIndex];

  await Promise.all([
    updateFieldOrder(current.id, swapWith.sort_order),
    updateFieldOrder(swapWith.id, current.sort_order),
  ]);

  revalidatePath(`/projects/${projectId}/form-builder`);
}
