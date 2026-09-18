"use client";

import { useMemo, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import type { FormField } from "@/lib/types";
import { Badge, Button, Card, Field, IconButton, Input, Label, Textarea } from "@/components/ui";
import { createArchiveItemAction, generateAutomatedFieldsAction } from "./actions";

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
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-charcoal/30 bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-charcoal"
      >
        <option value="">— select —</option>
        {field.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  return (
    <Input
      type={field.data_type === "date" ? "date" : field.data_type === "number" ? "number" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.data_type === "tags" ? "comma, separated, tags" : undefined}
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
  const [fileByField, setFileByField] = useState<Record<string, File | null>>({});
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [automatedValues, setAutomatedValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();
  const [generatingFieldId, setGeneratingFieldId] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const fieldsById = useMemo(
    () => Object.fromEntries(manualFields.map((f) => [f.id, f])),
    [manualFields],
  );

  function handleGenerate(fieldId?: string) {
    setError(null);
    setGeneratingFieldId(fieldId ?? null);
    startGenerating(async () => {
      try {
        const results = await generateAutomatedFieldsAction({
          projectId,
          manualValues,
          fieldId,
        });
        setAutomatedValues((prev) => ({ ...prev, ...results }));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setGeneratingFieldId(null);
      }
    });
  }

  function handleSave() {
    setError(null);
    startSaving(async () => {
      try {
        const formData = new FormData();
        formData.set("projectId", projectId);
        for (const [fieldId, file] of Object.entries(fileByField)) {
          if (file) formData.set(`file:${fieldId}`, file);
        }
        formData.set(
          "values",
          JSON.stringify({ ...manualValues, ...automatedValues }),
        );
        await createArchiveItemAction(formData);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  const hasManualInput = Object.values(manualValues).some((v) => v.trim());

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card>
        <h3 className="mb-4 font-sans text-sm font-extrabold">Source</h3>

        {manualFields.map((f) => (
          <Field key={f.id}>
            <Label>{f.name}</Label>
            {f.data_type === "file" ? (
              <input
                type="file"
                onChange={(e) =>
                  setFileByField((prev) => ({ ...prev, [f.id]: e.target.files?.[0] ?? null }))
                }
                className="w-full rounded border border-coral/40 bg-white px-3 py-2 text-sm"
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

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-sans text-sm font-extrabold">
            Generated fields <Badge color="teal">AI</Badge>
          </h3>
          <Button
            variant="secondary"
            type="button"
            onClick={() => handleGenerate()}
            disabled={!hasManualInput || isGenerating}
          >
            <Sparkles className="h-4 w-4" />
            {isGenerating && !generatingFieldId ? "Generating…" : "Generate all"}
          </Button>
        </div>

        {automatedFields.length === 0 ? (
          <p className="text-sm text-charcoal/50">
            No automated fields defined yet. Add some in the Form Builder.
          </p>
        ) : (
          automatedFields.map((f) => {
            const source = f.automation_source_field_id
              ? fieldsById[f.automation_source_field_id]
              : null;
            return (
              <Field key={f.id}>
                <div className="mb-1 flex items-center justify-between">
                  <Label>
                    {f.name}
                    {source ? (
                      <span className="ml-1 font-normal normal-case text-charcoal/40">
                        (from {source.name})
                      </span>
                    ) : null}
                  </Label>
                  <IconButton
                    type="button"
                    title="Generate with AI"
                    aria-label={`Generate ${f.name} with AI`}
                    onClick={() => handleGenerate(f.id)}
                    disabled={!hasManualInput || isGenerating}
                    className={generatingFieldId === f.id ? "animate-pulse" : ""}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </IconButton>
                </div>
                <Textarea
                  rows={2}
                  value={automatedValues[f.id] ?? ""}
                  onChange={(e) =>
                    setAutomatedValues((prev) => ({ ...prev, [f.id]: e.target.value }))
                  }
                  placeholder="Generated automatically — editable before saving"
                />
              </Field>
            );
          })
        )}
      </Card>

      <div>
        {error ? (
          <p className="mb-3 rounded border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
            {error}
          </p>
        ) : null}
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save to archive"}
        </Button>
      </div>
    </div>
  );
}
