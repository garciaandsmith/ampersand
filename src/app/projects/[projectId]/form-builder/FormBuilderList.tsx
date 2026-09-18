"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { FormField } from "@/lib/types";
import { FIELD_DATA_TYPE_LABELS } from "@/lib/types";
import { Badge, Button } from "@/components/ui";
import { FieldForm } from "./FieldForm";
import { deleteFieldAction } from "./actions";

export function FormBuilderList({
  projectId,
  fields,
}: {
  projectId: string;
  fields: FormField[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const fieldsById = Object.fromEntries(fields.map((f) => [f.id, f]));

  return (
    <div className="flex flex-col gap-3">
      {fields.map((f) => (
        <div
          key={f.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded border border-charcoal/15 bg-white px-4 py-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-sans text-sm font-extrabold">{f.name}</span>
            <Badge>{FIELD_DATA_TYPE_LABELS[f.data_type]}</Badge>
            <Badge color={f.input_type === "automated" ? "teal" : "charcoal"}>
              {f.input_type}
            </Badge>
            {f.input_type === "automated" && f.automation_source_field_id ? (
              <span className="text-xs text-charcoal/50">
                from &ldquo;{fieldsById[f.automation_source_field_id]?.name ?? "?"}&rdquo;
              </span>
            ) : null}
          </div>
          <form action={deleteFieldAction}>
            <input type="hidden" name="id" value={f.id} />
            <input type="hidden" name="projectId" value={projectId} />
            <Button variant="danger" type="submit" className="px-2 py-1 text-xs">
              Remove
            </Button>
          </form>
        </div>
      ))}

      {fields.length === 0 ? (
        <p className="rounded border border-dashed border-charcoal/25 px-4 py-6 text-center text-sm text-charcoal/50">
          No fields yet. Add your first one below.
        </p>
      ) : null}

      {addOpen ? (
        <div className="rounded border border-charcoal/15 bg-white p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-sans text-sm font-extrabold">New field</h3>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              aria-label="Cancel"
              className="text-charcoal/40 hover:text-charcoal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <FieldForm projectId={projectId} existingFields={fields} />
        </div>
      ) : (
        <Button variant="ghost" onClick={() => setAddOpen(true)} className="self-start">
          <Plus className="h-4 w-4" /> New field
        </Button>
      )}
    </div>
  );
}
