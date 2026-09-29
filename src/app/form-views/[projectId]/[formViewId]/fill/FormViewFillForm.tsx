"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { FormField, FormView } from "@/lib/types";
import { Button, Field, Label } from "@/components/ui";
import { FieldValueInput } from "@/components/FieldValueInput";
import { FileUploadField } from "@/components/FileUploadField";
import { submitFormViewAction, type StagedFile } from "./actions";

export function FormViewFillForm({
  projectId,
  formView,
  fields,
}: {
  projectId: string;
  formView: FormView;
  fields: FormField[];
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [stagedFiles, setStagedFiles] = useState<Record<string, StagedFile>>({});
  const [uploadingFieldIds, setUploadingFieldIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const isUploading = uploadingFieldIds.length > 0;

  function reset() {
    setValues({});
    setStagedFiles({});
    setSavedItemId(null);
    setError(null);
  }

  function handleSave() {
    setError(null);
    startSaving(async () => {
      const result = await submitFormViewAction({
        projectId,
        formViewId: formView.id,
        values,
        files: stagedFiles,
      });
      if ("error" in result) setError(result.error);
      else setSavedItemId(result.itemId);
    });
  }

  if (savedItemId) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <p className="font-sans text-lg font-extrabold text-charcoal">Saved.</p>
        <p className="text-sm text-charcoal/60">
          Added to the archive as a new record. Fill it out again, or open it to keep going.
        </p>
        <div className="flex gap-3">
          <Button onClick={reset}>Add another</Button>
          <Link href={`/projects/${projectId}/archive/${savedItemId}`}>
            <Button variant="secondary">Open record</Button>
          </Link>
        </div>
        <Link href={`/form-views/${projectId}`} className="text-xs text-charcoal/50 underline">
          Back to Form Views
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 pb-24">
      <div>
        <Link href={`/form-views/${projectId}`} className="text-xs text-charcoal/50 underline">
          ← Form Views
        </Link>
        <h1 className="mt-2 font-sans text-xl font-extrabold text-charcoal">{formView.name}</h1>
        {formView.description ? (
          <p className="mt-1 text-sm text-charcoal/60">{formView.description}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-5">
        {fields.map((f) => (
          <Field key={f.id}>
            <Label>{f.name}</Label>
            {f.data_type === "file" ? (
              <FileUploadField
                projectId={projectId}
                value={stagedFiles[f.id] ?? null}
                onChange={(file) =>
                  setStagedFiles((prev) => {
                    const next = { ...prev };
                    if (file) next[f.id] = file;
                    else delete next[f.id];
                    return next;
                  })
                }
                onBusyChange={(busy) =>
                  setUploadingFieldIds((prev) =>
                    busy ? [...prev.filter((id) => id !== f.id), f.id] : prev.filter((id) => id !== f.id),
                  )
                }
              />
            ) : (
              <FieldValueInput
                field={f}
                value={values[f.id] ?? ""}
                onChange={(v) => setValues((prev) => ({ ...prev, [f.id]: v }))}
              />
            )}
          </Field>
        ))}

        {fields.length === 0 ? (
          <p className="text-sm text-charcoal/50">This Form View has no fields yet.</p>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-charcoal/10 bg-paper px-4 py-3">
        <div className="mx-auto flex max-w-md items-center gap-3">
          {error ? <p className="flex-1 text-xs text-coral">{error}</p> : null}
          <Button onClick={handleSave} disabled={isSaving || isUploading} className="w-full py-3 text-base">
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
