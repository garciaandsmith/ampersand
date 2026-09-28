"use client";

import { useMemo, useState, useTransition } from "react";
import type { FormField } from "@/lib/types";
import { Button, Card, Field, Input, Label, MultiSelect, Select, Textarea } from "@/components/ui";
import { createArchiveItemAction, generateAutomatedFieldsAction, type StagedFile } from "./actions";
import { FileUploadField } from "../FileUploadField";
import { GeneratedFieldsCard } from "../GeneratedFieldsCard";

function ManualInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.data_type === "long_text") {
    return (
      <Textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Describe ${field.name.toLowerCase()}…`}
      />
    );
  }
  if (field.data_type === "single_select" && field.options) {
    return (
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— select —</option>
        {field.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
    );
  }
  if (field.data_type === "multi_select" && field.options) {
    const selected = value
      ? value.split(",").map((v) => v.trim()).filter(Boolean)
      : [];
    return (
      <MultiSelect
        label={selected.length ? selected.join(", ") : "— select —"}
        options={field.options.map((o) => ({ value: o, label: o }))}
        value={selected}
        onChange={(next) => onChange(next.join(", "))}
      />
    );
  }
  return (
    <Input
      type={field.data_type === "date" ? "date" : field.data_type === "number" ? "number" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={
        field.data_type === "tags"
          ? "comma, separated, tags"
          : field.data_type === "url"
            ? "https://…"
            : undefined
      }
    />
  );
}

export function NewArchiveItemForm({
  projectId,
  manualFields,
  automatedFields,
}: {
  projectId: string;
  manualFields: FormField[];
  automatedFields: FormField[];
}) {
  const [title, setTitle] = useState("");
  // Files are uploaded to storage the moment they're picked; this holds their references.
  const [stagedFiles, setStagedFiles] = useState<Record<string, StagedFile>>({});
  const [uploadingFieldIds, setUploadingFieldIds] = useState<string[]>([]);
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [automatedValues, setAutomatedValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [generatingIds, setGeneratingIds] = useState<string[]>([]);
  const [, startGenerating] = useTransition();
  const [isSaving, startSaving] = useTransition();

  const sourceNames = useMemo(() => {
    const byId = Object.fromEntries(manualFields.map((f) => [f.id, f.name]));
    return Object.fromEntries(
      automatedFields.flatMap((f) => {
        const name = f.automation_source_field_id ? byId[f.automation_source_field_id] : null;
        return name ? [[f.id, name]] : [];
      }),
    );
  }, [manualFields, automatedFields]);

  const isUploading = uploadingFieldIds.length > 0;

  function handleGenerate(fieldIds: string[]) {
    setError(null);
    setFieldErrors((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([id]) => !fieldIds.includes(id))),
    );
    setGeneratingIds(fieldIds);
    startGenerating(async () => {
      try {
        const { values, errors } = await generateAutomatedFieldsAction({
          projectId,
          // Includes already-generated automated values too, so a field can
          // use another automated field (e.g. a JSON-producing one) as its source.
          knownValues: { ...manualValues, ...automatedValues },
          stagedFiles,
          fieldIds,
        });
        setAutomatedValues((prev) => ({ ...prev, ...values }));
        setFieldErrors((prev) => ({ ...prev, ...errors }));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setGeneratingIds([]);
      }
    });
  }

  function handleSave() {
    setError(null);
    startSaving(async () => {
      try {
        const formData = new FormData();
        formData.set("projectId", projectId);
        formData.set("title", title);
        formData.set("files", JSON.stringify(stagedFiles));
        formData.set("values", JSON.stringify({ ...manualValues, ...automatedValues }));
        await createArchiveItemAction(formData);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  const hasManualInput =
    Object.values(manualValues).some((v) => v.trim()) || Object.keys(stagedFiles).length > 0;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card>
        <h3 className="mb-4 font-sans text-sm font-extrabold">Source</h3>

        <Field>
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Defaults to the uploaded file's name if left blank"
          />
        </Field>

        {manualFields.map((f) => (
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
              <div className="rounded border border-coral/40 p-0.5">
                <ManualInput
                  field={f}
                  value={manualValues[f.id] ?? ""}
                  onChange={(v) => setManualValues((prev) => ({ ...prev, [f.id]: v }))}
                />
              </div>
            )}
          </Field>
        ))}

        {manualFields.length === 0 ? (
          <p className="text-sm text-charcoal/50">
            No manual fields defined yet. Add some in the Form Builder.
          </p>
        ) : null}
      </Card>

      <GeneratedFieldsCard
        fields={automatedFields}
        sourceNames={sourceNames}
        values={automatedValues}
        errors={fieldErrors}
        generatingIds={generatingIds}
        disabled={!hasManualInput || isUploading}
        disabledHint={isUploading ? "Wait for the upload to finish" : "Fill in or upload something first"}
        placeholder="Generated automatically — editable before saving"
        onValueChange={(id, v) => setAutomatedValues((prev) => ({ ...prev, [id]: v }))}
        onGenerate={handleGenerate}
      />

      <div>
        {error ? (
          <p className="mb-3 rounded border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
            {error}
          </p>
        ) : null}
        <Button onClick={handleSave} disabled={isSaving || isUploading}>
          {isSaving ? "Saving…" : "Save to archive"}
        </Button>
      </div>
    </div>
  );
}
