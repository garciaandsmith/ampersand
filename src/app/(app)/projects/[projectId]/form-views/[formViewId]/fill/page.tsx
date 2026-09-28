import { notFound } from "next/navigation";
import { requireProjectAccessPage } from "@/lib/auth/session";
import { getFormViewWithFields } from "@/lib/data/formViews";
import { FormViewFillForm } from "./FormViewFillForm";

export default async function FillFormViewPage({
  params,
}: {
  params: Promise<{ projectId: string; formViewId: string }>;
}) {
  const { projectId, formViewId } = await params;
  await requireProjectAccessPage(projectId, "editor");

  const viewWithFields = await getFormViewWithFields(formViewId);
  if (!viewWithFields || viewWithFields.view.project_id !== projectId) notFound();

  return (
    <FormViewFillForm
      projectId={projectId}
      formView={viewWithFields.view}
      fields={viewWithFields.fields}
    />
  );
}
