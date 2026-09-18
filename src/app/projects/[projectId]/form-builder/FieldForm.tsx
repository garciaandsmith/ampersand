"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { FieldDataType, SkillKey } from "@/lib/types";
import {
  FIELD_DATA_TYPE_LABELS,
  SKILL_LABELS,
  SKILL_NEEDS_PROMPT,
  SKILL_NEEDS_SOURCE_FIELD,
  SKILL_SOURCE_FIELD_FILTER,
} from "@/lib/types";
import { Button, Field, Input, Label, Select, Textarea } from "@/components/ui";
import type { DraftField } from "./draft";

const DATA_TYPES = Object.keys(FIELD_DATA_TYPE_LABELS) as FieldDataType[];
const SKILL_KEYS = Object.keys(SKILL_LABELS) as SkillKey[];

export function FieldForm({
  existingFields,
  field,
  onSubmit,
  onCancel,
}: {
  existingFields: DraftField[];
  field?: DraftField;
  onSubmit: (values: Omit<DraftField, "id">) => void;
  onCancel: () => void;
}) {
  const isEditing = Boolean(field);
  const [dataType, setDataType] = useState<FieldDataType>(field?.data_type ?? "text");
  const [inputType, setInputType] = useState<"manual" | "automated">(
    field?.input_type ?? "manual",
  );
  const [skillKey, setSkillKey] = useState<SkillKey>(field?.skill_key ?? "field_automation");
  const [dirty, setDirty] = useState(false);

  const showOptions = dataType === "single_select" || dataType === "multi_select";
  const sourceOptions = useMemo(
    () =>
      existingFields.filter(
        (f) => f.id !== field?.id && SKILL_SOURCE_FIELD_FILTER[skillKey](f.data_type),
      ),
    [existingFields, field?.id, skillKey],
  );
  const needsSourceField = SKILL_NEEDS_SOURCE_FIELD[skillKey];
  const needsPrompt = SKILL_NEEDS_PROMPT[skillKey];

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
    if (dirty && !window.confirm("Discard your changes to this field?")) {
      return;
    }
    onCancel();
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const optionsRaw = String(formData.get("options") ?? "").trim();
    const options = optionsRaw
      ? optionsRaw.split(",").map((o) => o.trim()).filter(Boolean)
      : null;
    const automationSourceFieldId =
      String(formData.get("automationSourceFieldId") ?? "") || null;
    const automationPrompt = String(formData.get("automationPrompt") ?? "").trim() || null;

    onSubmit({
      name,
      data_type: dataType,
      options,
      input_type: inputType,
      automation_source_field_id: inputType === "automated" ? automationSourceFieldId : null,
      automation_prompt: inputType === "automated" ? automationPrompt : null,
      skill_key: inputType === "automated" ? skillKey : null,
      // Owner/admin per-field provider+model override isn't exposed in the UI
      // yet — pending a decision on how to gate it (see ADR 0003). Preserve
      // whatever an existing field already has rather than clobbering it.
      automation_provider_override_id: field?.automation_provider_override_id ?? null,
      automation_model_override: field?.automation_model_override ?? null,
    });

    if (!isEditing) {
      e.currentTarget.reset();
      setDataType("text");
      setInputType("manual");
      setSkillKey("field_automation");
    }
    setDirty(false);
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

      <form
        onSubmit={handleSubmit}
        onChange={() => setDirty(true)}
        className="flex flex-col gap-2"
      >
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
              <Label>Skill</Label>
              <Select
                name="skillKey"
                value={skillKey}
                onChange={(e) => setSkillKey(e.target.value as SkillKey)}
              >
                {SKILL_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {SKILL_LABELS[key]}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-charcoal/50">
                Governs which AI capability generates this field. The provider and model
                come from this skill&rsquo;s default in Admin → Settings.
              </p>
            </Field>

            {needsSourceField ? (
              <Field>
                <Label>
                  Input (source field)
                  {skillKey === "image_recognition" || skillKey === "document_parsing"
                    ? " — must be a file field"
                    : null}
                </Label>
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
                {sourceOptions.length === 0 ? (
                  <p className="mt-1 text-xs text-coral">
                    No eligible source fields yet for this skill.
                  </p>
                ) : null}
              </Field>
            ) : null}

            <Field>
              <Label>Prompt{needsPrompt ? "" : " (optional — uses a default if left blank)"}</Label>
              <Textarea
                name="automationPrompt"
                rows={3}
                placeholder='e.g. "Select a maximum of 10 relevant tags that represent the main topics in this description"'
                defaultValue={field?.automation_prompt ?? ""}
                required={needsPrompt}
              />
            </Field>
          </>
        ) : null}

        <div className="flex items-center gap-2">
          <Button type="submit" className="self-start">
            {isEditing ? "Update field" : "Add field"}
          </Button>
          <Button type="button" variant="ghost" onClick={handleCancel} className="self-start">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
