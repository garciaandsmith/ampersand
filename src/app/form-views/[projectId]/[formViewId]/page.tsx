import { notFound } from "next/navigation";
import { requireProjectAccessPage } from "@/lib/auth/session";
import { listFields } from "@/lib/data/fields";
import { getFormViewWithFields } from "@/lib/data/formViews";
import { FormViewEditor } from "../FormViewEditor";

export default async function EditFormViewPage({
  params,
}: {
  params: Promise<{ projectId: string; formViewId: string }>;
}) {
  const { projectId, formViewId } = await params;
  await requireProjectAccessPage(projectId, "editor");

  const [fields, viewWithFields] = await Promise.all([
    listFields(projectId),
    getFormViewWithFields(formViewId),
  ]);
  if (!viewWithFields || viewWithFields.view.project_id !== projectId) notFound();

  const manualFields = fields.filter((f) => f.input_type === "manual");

  return (
    <div className="max-w-2xl">
      <h2 className="mb-1 font-sans text-base font-extrabold">Edit Form View</h2>
      <p className="mb-6 max-w-2xl text-sm text-charcoal/60">
        Pick which fields belong on this view and the order they appear in.
      </p>
      <FormViewEditor
        projectId={projectId}
        manualFields={manualFields}
        formView={viewWithFields.view}
        initialFieldIds={viewWithFields.fields.map((f) => f.id)}
      />
    </div>
  );
}
