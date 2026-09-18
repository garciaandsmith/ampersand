"use client";

import { useState } from "react";
import type { FormField, FieldDataType } from "@/lib/types";
import { FIELD_DATA_TYPE_LABELS } from "@/lib/types";
import { Button, Field, Input, Label, Select, Textarea } from "@/components/ui";
import { createFieldAction } from "./actions";

const DATA_TYPES = Object.keys(FIELD_DATA_TYPE_LABELS) as FieldDataType[];

export function FieldForm({
  projectId,
  existingFields,
}: {
  projectId: string;
  existingFields: FormField[];
}) {
  const [dataType, setDataType] = useState<FieldDataType>("text");
  const [inputType, setInputType] = useState<"manual" | "automated">("manual");

  const showOptions = dataType === "single_select" || dataType === "multi_select";

  return (
    <form action={createFieldAction} className="flex flex-col gap-2">
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

      <Button type="submit" className="self-start">
        Add field
      </Button>
    </form>
  );
}
