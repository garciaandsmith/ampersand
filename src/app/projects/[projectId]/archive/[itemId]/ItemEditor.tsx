"use client";

import { useMemo, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import type { FormField } from "@/lib/types";
import { Badge, Button, Card, Field, IconButton, Input, Label, Textarea } from "@/components/ui";
import { updateArchiveItemAction } from "./actions";
import { generateAutomatedFieldsAction } from "../new/actions";

function ValueInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.data_type === "long_text") {
    return <Textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} />;
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
    />
  );
}

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
  const [isGenerating, startGenerating] = useTransition();
  const [generatingFieldId, setGeneratingFieldId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const editableManualFields = useMemo(
    () => manualFields.filter((f) => f.data_type !== "file"),
    [manualFields],
  );

  function setValue(fieldId: string, v: string) {
    setSaved(false);
    setValues((prev) => ({ ...prev, [fieldId]: v }));
  }

  function handleGenerate(fieldId?: string) {
    setError(null);
    setGeneratingFieldId(fieldId ?? null);
    startGenerating(async () => {
      try {
        const results = await generateAutomatedFieldsAction({
          projectId,
          manualValues: values,
          itemId,
          fieldId,
        });
        setValues((prev) => ({ ...prev, ...results }));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setGeneratingFieldId(null);
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
            <ValueInput
              field={f}
              value={values[f.id] ?? ""}
              onChange={(v) => setValue(f.id, v)}
            />
          </Field>
        ))}
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
            disabled={isGenerating}
          >
            <Sparkles className="h-4 w-4" />
            {isGenerating && !generatingFieldId ? "Generating…" : "Generate all"}
          </Button>
        </div>
        {automatedFields.length === 0 ? (
          <p className="text-sm text-charcoal/50">No automated fields defined.</p>
        ) : (
          automatedFields.map((f) => (
            <Field key={f.id}>
              <div className="mb-1 flex items-center justify-between">
                <Label>{f.name}</Label>
                <IconButton
                  type="button"
                  title="Generate with AI"
                  aria-label={`Generate ${f.name} with AI`}
                  onClick={() => handleGenerate(f.id)}
                  disabled={isGenerating}
                  className={generatingFieldId === f.id ? "animate-pulse" : ""}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </IconButton>
              </div>
              <Textarea
                rows={2}
                value={values[f.id] ?? ""}
                onChange={(e) => setValue(f.id, e.target.value)}
              />
            </Field>
          ))
        )}
      </Card>

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
