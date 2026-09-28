"use client";

import { useMemo, useState, useTransition } from "react";
import type { FormField } from "@/lib/types";
import { Button, Card, Field, Input, Label } from "@/components/ui";
import { FieldValueInput } from "@/components/FieldValueInput";
import { updateArchiveItemAction } from "./actions";
import { generateAutomatedFieldsAction } from "../new/actions";
import { GeneratedFieldsCard } from "../GeneratedFieldsCard";

export function ItemEditor({
  projectId,
  itemId,
  manualFields,
  automatedFields,
  initialValues,
  initialTitle,
}: {
  projectId: string;
  itemId: string;
  manualFields: FormField[];
  automatedFields: FormField[];
  initialValues: Record<string, string>;
  initialTitle: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [, startGenerating] = useTransition();
  const [generatingIds, setGeneratingIds] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const editableManualFields = useMemo(
    () => manualFields.filter((f) => f.data_type !== "file"),
    [manualFields],
  );

  function setValue(fieldId: string, v: string) {
    setSaved(false);
    setValues((prev) => ({ ...prev, [fieldId]: v }));
  }

  const sourceNames = useMemo(() => {
    const byId = Object.fromEntries(manualFields.map((f) => [f.id, f.name]));
    return Object.fromEntries(
      automatedFields.flatMap((f) => {
        const name = f.automation_source_field_id ? byId[f.automation_source_field_id] : null;
        return name ? [[f.id, name]] : [];
      }),
    );
  }, [manualFields, automatedFields]);

  function handleGenerate(fieldIds: string[]) {
    setError(null);
    setFieldErrors((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([id]) => !fieldIds.includes(id))),
    );
    setGeneratingIds(fieldIds);
    startGenerating(async () => {
      try {
        const { values: generated, errors } = await generateAutomatedFieldsAction({
          projectId,
          knownValues: values,
          itemId,
          fieldIds,
        });
        if (Object.keys(generated).length > 0) setSaved(false);
        setValues((prev) => ({ ...prev, ...generated }));
        setFieldErrors((prev) => ({ ...prev, ...errors }));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setGeneratingIds([]);
      }
    });
  }

  async function handleSave() {
    setError(null);
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.set("projectId", projectId);
      formData.set("itemId", itemId);
      formData.set("title", title);
      formData.set("values", JSON.stringify(values));
      await updateArchiveItemAction(formData);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card>
        <h3 className="mb-4 font-sans text-sm font-extrabold">Fields</h3>
        <Field>
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => {
              setSaved(false);
              setTitle(e.target.value);
            }}
          />
        </Field>
        {editableManualFields.map((f) => (
          <Field key={f.id}>
            <Label>{f.name}</Label>
            <FieldValueInput
              field={f}
              value={values[f.id] ?? ""}
              onChange={(v) => setValue(f.id, v)}
            />
          </Field>
        ))}
      </Card>

      <GeneratedFieldsCard
        fields={automatedFields}
        sourceNames={sourceNames}
        values={values}
        errors={fieldErrors}
        generatingIds={generatingIds}
        disabled={false}
        onValueChange={setValue}
        onGenerate={handleGenerate}
      />

      <div className="flex items-center gap-3">
        {error ? (
          <p className="rounded border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
            {error}
          </p>
        ) : null}
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save changes"}
        </Button>
        {saved ? <span className="text-sm text-charcoal/50">Saved.</span> : null}
      </div>
    </div>
  );
}
