"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProjectRoleAction } from "@/lib/auth/session";
import { createFormView, deleteFormView, updateFormView } from "@/lib/data/formViews";

export async function saveFormViewAction(input: {
  projectId: string;
  formViewId?: string;
  name: string;
  description: string;
  fieldIds: string[];
}): Promise<{ error: string } | undefined> {
  const user = await requireProjectRoleAction(input.projectId, "editor");

  const name = input.name.trim();
  if (!name) return { error: "Give this Form View a name." };
  if (input.fieldIds.length === 0) return { error: "Include at least one field." };

  if (input.formViewId) {
    await updateFormView(input.formViewId, {
      name,
      description: input.description.trim() || null,
      fieldIds: input.fieldIds,
    });
  } else {
    await createFormView({
      projectId: input.projectId,
      name,
      description: input.description.trim() || null,
      fieldIds: input.fieldIds,
      createdBy: user.id,
    });
  }

  revalidatePath(`/form-views/${input.projectId}`);
  redirect(`/form-views/${input.projectId}`);
}

export async function deleteFormViewAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const formViewId = String(formData.get("formViewId") ?? "");
  if (!projectId || !formViewId) throw new Error("Missing form view id");
  await requireProjectRoleAction(projectId, "editor");
  await deleteFormView(formViewId);
  revalidatePath(`/form-views/${projectId}`);
}
