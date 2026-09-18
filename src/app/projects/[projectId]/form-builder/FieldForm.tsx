"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { FormField, FieldDataType } from "@/lib/types";
import { FIELD_DATA_TYPE_LABELS } from "@/lib/types";
import { Button, Field, Input, Label, Select, Textarea } from "@/components/ui";
import { createFieldAction, updateFieldAction } from "./actions";

const DATA_TYPES = Object.keys(FIELD_DATA_TYPE_LABELS) as FieldDataType[];

export function FieldForm({
  projectId,
  existingFields,
  field,
  onCancel,
}: {
  projectId: string;
  existingFields: FormField[];
  field?: FormField;
  onCancel: () => void;
}) {
  const isEditing = Boolean(field);
  const [dataType, setDataType] = useState<FieldDataType>(field?.data_type ?? "text");
  const [inputType, setInputType] = useState<"manual" | "automated">(
    field?.input_type ?? "manual",
  );
  const [dirty, setDirty] = useState(false);

  const showOptions = dataType === "single_select" || dataType === "multi_select";
  const sourceOptions = existingFields.filter((f) => f.id !== field?.id);

  useEffect(() => {
    if (!dirty) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  function handleCancel() {
    if (dirty && !window.confirm("Leave without saving? Your changes won't be kept.")) {
      return;
    }
    onCancel();
  }

  async function handleSubmit(formData: FormData) {
    if (isEditing) {
      await updateFieldAction(formData);
      onCancel();
    } else {
      await createFieldAction(formData);
    }
  }

  return (
    <div className="rounded border border-charcoal/15 bg-white p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-sans text-sm font-extrabold">
          {isEditing ? "Edit field" : "New field"}
        </h3>
        <button
          type="button"
          onClick={handleCancel}
          aria-label="Cancel"
          className="text-charcoal/40 hover:text-charcoal"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form action={handleSubmit} onChange={() => setDirty(true)} className="flex flex-col gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        {isEditing ? <input type="hidden" name="id" value={field!.id} /> : null}

        <Field>
          <Label>Name</Label>
          <Input name="name" placeholder="e.g. Tags" defaultValue={field?.name} required />
        </Field>

        <Field>
          <Label>Data type</Label>
          <Select
            name="dataType"
            value={dataType}
            onChange={(e) => setDataType(e.target.value as FieldDataType)}
          >
            {DATA_TYPES.map((dt) => (
              <option key={dt} value={dt}>
                {FIELD_DATA_TYPE_LABELS[dt]}
              </option>
            ))}
          </Select>
        </Field>

        {showOptions ? (
          <Field>
            <Label>Options (comma separated)</Label>
            <Input
              name="options"
              placeholder="Photo, Video, Document"
              defaultValue={field?.options?.join(", ")}
            />
          </Field>
        ) : null}

        <Field>
          <Label>Input type</Label>
          <Select
            name="inputType"
            value={inputType}
            onChange={(e) => setInputType(e.target.value as "manual" | "automated")}
          >
            <option value="manual">Manual</option>
            <option value="automated">Automated</option>
          </Select>
        </Field>

        {inputType === "automated" ? (
          <>
            <Field>
              <Label>Input (source field)</Label>
              <Select
                name="automationSourceFieldId"
                defaultValue={field?.automation_source_field_id ?? ""}
                required
              >
                <option value="">— select a field —</option>
                {sourceOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label>Prompt</Label>
              <Textarea
                name="automationPrompt"
                rows={3}
                placeholder='e.g. "Select a maximum of 10 relevant tags that represent the main topics in this description"'
                defaultValue={field?.automation_prompt ?? ""}
                required
              />
            </Field>
          </>
        ) : null}

        <div className="flex items-center gap-2">
          <Button type="submit" className="self-start">
            Save field
          </Button>
          <Button type="button" variant="ghost" onClick={handleCancel} className="self-start">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
