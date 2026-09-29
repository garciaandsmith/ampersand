import { requireProjectAccessPage } from "@/lib/auth/session";
import { listFields } from "@/lib/data/fields";
import { FormViewEditor } from "../FormViewEditor";

export default async function NewFormViewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  await requireProjectAccessPage(projectId, "editor");
  const fields = await listFields(projectId);
  const manualFields = fields.filter((f) => f.input_type === "manual");

  return (
    <div className="max-w-2xl">
      <h2 className="mb-1 font-sans text-base font-extrabold">New Form View</h2>
      <p className="mb-6 max-w-2xl text-sm text-charcoal/60">
        Pick which fields belong on this view and the order they appear in.
      </p>
      <FormViewEditor projectId={projectId} manualFields={manualFields} />
    </div>
  );
}
