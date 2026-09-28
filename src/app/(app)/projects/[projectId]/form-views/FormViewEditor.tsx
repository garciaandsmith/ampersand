"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import type { FormField, FormView } from "@/lib/types";
import { Badge, Button, Card, Field, IconButton, Input, Label, Textarea } from "@/components/ui";
import { saveFormViewAction } from "./actions";

export function FormViewEditor({
  projectId,
  manualFields,
  formView,
  initialFieldIds,
}: {
  projectId: string;
  manualFields: FormField[];
  formView?: FormView;
  initialFieldIds?: string[];
}) {
  const [name, setName] = useState(formView?.name ?? "");
  const [description, setDescription] = useState(formView?.description ?? "");
  const [fieldIds, setFieldIds] = useState<string[]>(initialFieldIds ?? []);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const fieldsById = Object.fromEntries(manualFields.map((f) => [f.id, f]));
  const available = manualFields.filter((f) => !fieldIds.includes(f.id));

  function move(index: number, dir: -1 | 1) {
    const next = [...fieldIds];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setFieldIds(next);
  }

  function handleSave() {
    setError(null);
    startSaving(async () => {
      const result = await saveFormViewAction({
        projectId,
        formViewId: formView?.id,
        name,
        description,
        fieldIds,
      });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <Field>
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Site visit quick log"
          />
        </Field>
        <Field>
          <Label>Description (optional)</Label>
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </Card>

      <Card>
        <h3 className="mb-3 font-sans text-sm font-extrabold">Included fields</h3>
        {fieldIds.length === 0 ? (
          <p className="mb-4 text-sm text-charcoal/50">No fields yet — add some below.</p>
        ) : (
          <div className="mb-4 flex flex-col gap-2">
            {fieldIds.map((id, i) => {
              const f = fieldsById[id];
              if (!f) return null;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-3 rounded border border-charcoal/15 bg-white px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{f.name}</span>
                    <Badge>{f.data_type}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconButton
                      type="button"
                      aria-label="Move up"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      className="h-7 w-7 p-0"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton
                      type="button"
                      aria-label="Move down"
                      disabled={i === fieldIds.length - 1}
                      onClick={() => move(i, 1)}
                      className="h-7 w-7 p-0"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </IconButton>
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => setFieldIds((prev) => prev.filter((fid) => fid !== id))}
                      className="px-2 py-1 text-xs"
                    >
                      <X className="h-3.5 w-3.5" /> Remove
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {available.length > 0 ? (
          <>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-charcoal/50">
              Available fields
            </h4>
            <div className="flex flex-wrap gap-2">
              {available.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFieldIds((prev) => [...prev, f.id])}
                  className="inline-flex items-center gap-1 rounded border border-charcoal/20 bg-white px-3 py-1.5 text-sm font-semibold text-charcoal hover:border-charcoal"
                >
                  <Plus className="h-3.5 w-3.5" /> {f.name}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </Card>

      <div className="flex items-center gap-3">
        {error ? (
          <p role="alert" className="rounded border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
            {error}
          </p>
        ) : null}
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save Form View"}
        </Button>
        <Link href={`/projects/${projectId}/form-views`} className="text-sm text-charcoal/60 underline">
          Cancel
        </Link>
      </div>
    </div>
  );
}
