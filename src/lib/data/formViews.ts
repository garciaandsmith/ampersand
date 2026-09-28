import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { listFields } from "@/lib/data/fields";
import type { FormField, FormView } from "@/lib/types";

export async function listFormViews(projectId: string): Promise<FormView[]> {
  const { data, error } = await supabaseAdmin()
    .from("form_views")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getFormView(id: string): Promise<FormView | null> {
  const { data, error } = await supabaseAdmin()
    .from("form_views")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/** How many fields each Form View has, keyed by form view id — for the list page. */
export async function countFormViewFields(formViewIds: string[]): Promise<Record<string, number>> {
  if (formViewIds.length === 0) return {};
  const { data, error } = await supabaseAdmin()
    .from("form_view_fields")
    .select("form_view_id")
    .in("form_view_id", formViewIds);

  if (error) throw new Error(error.message);

  const counts: Record<string, number> = {};
  for (const row of data) counts[row.form_view_id] = (counts[row.form_view_id] ?? 0) + 1;
  return counts;
}

async function listFormViewFieldIds(formViewId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin()
    .from("form_view_fields")
    .select("field_id")
    .eq("form_view_id", formViewId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data.map((r) => r.field_id as string);
}

/** A Form View with its fields resolved in the view's own order — used by both the field-picker (edit mode) and the fill screen. */
export async function getFormViewWithFields(
  id: string,
): Promise<{ view: FormView; fields: FormField[] } | null> {
  const view = await getFormView(id);
  if (!view) return null;

  const [fieldIds, allFields] = await Promise.all([
    listFormViewFieldIds(id),
    listFields(view.project_id),
  ]);
  const byId = Object.fromEntries(allFields.map((f) => [f.id, f]));
  // flatMap drops any id whose field was deleted from the Form Builder since this view last saved.
  const fields = fieldIds.flatMap((fid) => (byId[fid] ? [byId[fid]] : []));
  return { view, fields };
}

async function replaceFormViewFields(formViewId: string, fieldIds: string[]): Promise<void> {
  const { error: deleteError } = await supabaseAdmin()
    .from("form_view_fields")
    .delete()
    .eq("form_view_id", formViewId);
  if (deleteError) throw new Error(deleteError.message);

  if (fieldIds.length === 0) return;
  const { error: insertError } = await supabaseAdmin()
    .from("form_view_fields")
    .insert(fieldIds.map((fieldId, i) => ({ form_view_id: formViewId, field_id: fieldId, sort_order: i })));
  if (insertError) throw new Error(insertError.message);
}

export async function createFormView(input: {
  projectId: string;
  name: string;
  description: string | null;
  fieldIds: string[];
  createdBy: string;
}): Promise<FormView> {
  const { data, error } = await supabaseAdmin()
    .from("form_views")
    .insert({
      project_id: input.projectId,
      name: input.name,
      description: input.description,
      created_by: input.createdBy,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await replaceFormViewFields(data.id, input.fieldIds);
  return data;
}

export async function updateFormView(
  id: string,
  input: { name: string; description: string | null; fieldIds: string[] },
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("form_views")
    .update({ name: input.name, description: input.description, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);

  await replaceFormViewFields(id, input.fieldIds);
}

export async function deleteFormView(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from("form_views").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function recordFormViewSubmission(input: {
  formViewId: string;
  archiveItemId: string;
  createdBy: string;
}): Promise<void> {
  const { error } = await supabaseAdmin().from("form_view_submissions").insert({
    form_view_id: input.formViewId,
    archive_item_id: input.archiveItemId,
    created_by: input.createdBy,
  });
  if (error) throw new Error(error.message);
}
