"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { FormField, FieldDataType } from "@/lib/types";
import { FIELD_DATA_TYPE_LABELS } from "@/lib/types";
import { Button, Field, Input, Label, Select, Textarea } from "@/components/ui";
import { createFieldAction } from "./actions";

const DATA_TYPES = Object.keys(FIELD_DATA_TYPE_LABELS) as FieldDataType[];

export function FieldForm({
  projectId,
  existingFields,
  onCancel,
}: {
  projectId: string;
  existingFields: FormField[];
  onCancel: () => void;
}) {
  const [dataType, setDataType] = useState<FieldDataType>("text");
  const [inputType, setInputType] = useState<"manual" | "automated">("manual");
  const [dirty, setDirty] = useState(false);

  const showOptions = dataType === "single_select" || dataType === "multi_select";

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
    if (dirty && !window.confirm("Leave without saving? Your new field won't be created.")) {
      return;
    }
    onCancel();
  }

  return (
    <div className="rounded border border-charcoal/15 bg-white p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-sans text-sm font-extrabold">New field</h3>
        <button
          type="button"
          onClick={handleCancel}
          aria-label="Cancel"
          className="text-charcoal/40 hover:text-charcoal"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form
        action={createFieldAction}
        onChange={() => setDirty(true)}
        className="flex flex-col gap-2"
      >
        <input type="hidden" name="projectId" value={projectId} />

        <Field>
          <Label>Name</Label>
          <Input name="name" placeholder="e.g. Tags" required />
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
            <Input name="options" placeholder="Photo, Video, Document" />
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
              <Select name="automationSourceFieldId" required>
                <option value="">— select a field —</option>
                {existingFields.map((f) => (
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
