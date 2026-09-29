import { requireProjectAccessPage } from "@/lib/auth/session";
import { listFields } from "@/lib/data/fields";
import { countFormViewFields, listFormViews } from "@/lib/data/formViews";
import { FormViewsList } from "./FormViewsList";

export default async function FormViewsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  // Managing Form Views is an editor-level action, same as the Form Builder.
  await requireProjectAccessPage(projectId, "editor");

  const [views, fields] = await Promise.all([listFormViews(projectId), listFields(projectId)]);
  const fieldCounts = await countFormViewFields(views.map((v) => v.id));
  const manualFieldCount = fields.filter((f) => f.input_type === "manual").length;

  return (
    <div className="max-w-3xl">
      <h2 className="mb-1 font-sans text-base font-extrabold">Form Views</h2>
      <p className="mb-6 max-w-2xl text-sm text-charcoal/60">
        A Form View is a comfy, mobile-first subset of this project&rsquo;s manual
        fields — handy for quick input on a phone. Filling one out creates a
        new archive record with just those fields set; finish it later from
        the full archive.
      </p>
      <FormViewsList
        projectId={projectId}
        views={views}
        fieldCounts={fieldCounts}
        manualFieldCount={manualFieldCount}
      />
    </div>
  );
}
