import type { FormField } from "@/lib/types";
import { Card, Field, Label } from "@/components/ui";

/**
 * Plain read-only display of a record's fields, for read-only Users — no
 * inputs, no save, no generate. Editors/admins get ItemEditor instead.
 */
export function ArchiveItemView({
  manualFields,
  automatedFields,
  values,
  title,
}: {
  manualFields: FormField[];
  automatedFields: FormField[];
  values: Record<string, string>;
  title: string;
}) {
  const fields = [...manualFields.filter((f) => f.data_type !== "file"), ...automatedFields];

  return (
    <Card className="max-w-2xl">
      <h3 className="mb-4 font-sans text-sm font-extrabold">Fields</h3>
      <Field>
        <Label>Title</Label>
        <p className="text-sm text-charcoal">{title || "—"}</p>
      </Field>
      {fields.map((f) => (
        <Field key={f.id}>
          <Label>{f.name}</Label>
          <p className="whitespace-pre-wrap text-sm text-charcoal">{values[f.id] || "—"}</p>
        </Field>
      ))}
    </Card>
  );
}
