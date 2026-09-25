"use client";

import { useMemo, useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { AiSkill, AutomationKind, FieldDataType } from "@/lib/types";
import { AUTOMATION_KIND_LABELS, FIELD_DATA_TYPE_LABELS, SKILL_KIND_LABELS } from "@/lib/types";
import { Button, Field, Input, Label, Select, Textarea } from "@/components/ui";
import type { DraftField } from "./draft";

const DATA_TYPES = Object.keys(FIELD_DATA_TYPE_LABELS) as FieldDataType[];

export function FieldForm({
  existingFields,
  skills,
  field,
  onSubmit,
  onCancel,
}: {
  existingFields: DraftField[];
  skills: AiSkill[];
  field?: DraftField;
  onSubmit: (values: Omit<DraftField, "id">) => void;
  onCancel: () => void;
}) {
  const isEditing = Boolean(field);
  const [dataType, setDataType] = useState<FieldDataType>(field?.data_type ?? "text");
  const [inputType, setInputType] = useState<"manual" | "automated">(
    field?.input_type ?? "manual",
  );
  const [automationKind, setAutomationKind] = useState<AutomationKind>(
    field?.automation_kind ?? "ai",
  );
  const [skillId, setSkillId] = useState<string>(field?.skill_id ?? skills[0]?.id ?? "");
  const [sourceId, setSourceId] = useState<string>(field?.automation_source_field_id ?? "");
  const [dirty, setDirty] = useState(false);

  const selectedSkill = skills.find((s) => s.id === skillId);
  const sourceField = existingFields.find((f) => f.id === sourceId);

  const showOptions = dataType === "single_select" || dataType === "multi_select";
  const sourceOptions = useMemo(
    () => existingFields.filter((f) => f.id !== field?.id),
    [existingFields, field?.id],
  );

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
    const automationJsonKey = String(formData.get("automationJsonKey") ?? "").trim() || null;
    const isAutomated = inputType === "automated";
    const isAiKind = isAutomated && automationKind === "ai";
    const isJsonKind = isAutomated && automationKind === "json_extract";

    onSubmit({
      name,
      data_type: dataType,
      options,
      input_type: inputType,
      automation_source_field_id: isAutomated ? automationSourceFieldId : null,
      automation_prompt: isAiKind ? automationPrompt : null,
      skill_id: isAiKind ? skillId || null : null,
      automation_kind: isAutomated ? automationKind : "ai",
      automation_json_key: isJsonKind ? automationJsonKey : null,
    });

    if (!isEditing) {
      e.currentTarget.reset();
      setDataType("text");
      setInputType("manual");
      setAutomationKind("ai");
      setSkillId(skills[0]?.id ?? "");
      setSourceId("");
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
              <Label>Automation kind</Label>
              <Select
                name="automationKind"
                value={automationKind}
                onChange={(e) => setAutomationKind(e.target.value as AutomationKind)}
              >
                {(Object.keys(AUTOMATION_KIND_LABELS) as AutomationKind[]).map((k) => (
                  <option key={k} value={k}>
                    {AUTOMATION_KIND_LABELS[k]}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-charcoal/50">
                {automationKind === "json_extract"
                  ? "Reads one key out of the source field's content — no AI call, free and instant. The source should hold a JSON object, typically another automated field that produces one."
                  : "Calls a skill (an AI model) to generate the value from the source and prompt below."}
              </p>
            </Field>

            {automationKind === "ai" ? (
              <Field>
                <Label>Skill</Label>
                <Select
                  name="skillId"
                  value={skillId}
                  onChange={(e) => setSkillId(e.target.value)}
                  required
                >
                  {skills.length === 0 ? <option value="">— no skills configured —</option> : null}
                  {skills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-charcoal/50">
                  Picks the provider and model this field&rsquo;s generation uses, set by an
                  admin in Settings.{selectedSkill ? ` Type: ${SKILL_KIND_LABELS[selectedSkill.kind ?? "chat"]}.` : ""}
                </p>
              </Field>
            ) : null}

            <Field>
              <Label>Input (source field{automationKind === "ai" ? ", optional" : ""})</Label>
              <Select
                name="automationSourceFieldId"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
              >
                <option value="">— none —</option>
                {sourceOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
              {automationKind === "ai" && selectedSkill?.kind === "transcription" && sourceField?.data_type !== "file" ? (
                <p className="mt-1 text-xs text-coral">
                  &ldquo;{selectedSkill.name}&rdquo; is a transcription skill, so its input must be
                  a file field holding audio or video.
                </p>
              ) : null}
              {automationKind === "ai" && selectedSkill?.kind !== "transcription" && sourceField?.data_type === "file" ? (
                <p className="mt-1 text-xs text-charcoal/50">
                  Chat skills can read images and PDFs from a file field. For audio or video, use
                  a transcription skill.
                </p>
              ) : null}
              {automationKind === "json_extract" && sourceField?.data_type === "file" ? (
                <p className="mt-1 text-xs text-coral">
                  JSON extraction reads text, not a file — pick a text field holding the JSON.
                </p>
              ) : null}
            </Field>

            {automationKind === "ai" ? (
              <Field>
                <Label>Prompt</Label>
                <Textarea
                  name="automationPrompt"
                  rows={3}
                  placeholder='e.g. "Select a maximum of 10 relevant tags that represent the main topics in this description"'
                  defaultValue={field?.automation_prompt ?? ""}
                />
                {selectedSkill?.kind === "transcription" ? (
                  <p className="mt-1 text-xs text-charcoal/50">
                    Not used — a transcription skill writes the transcript as it is.
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-charcoal/50">
                  The answer is generated in this field&rsquo;s data type
                  {showOptions ? " and must be one of its options" : ""}.
                </p>
                {dataType === "file" ? (
                  <p className="mt-1 text-xs text-coral">
                    Generating files or images isn&rsquo;t supported yet — pick a text-based data
                    type.
                  </p>
                ) : null}
              </Field>
            ) : (
              <Field>
                <Label>JSON key</Label>
                <Input
                  name="automationJsonKey"
                  placeholder="e.g. topics"
                  defaultValue={field?.automation_json_key ?? ""}
                  required
                />
                <p className="mt-1 text-xs text-charcoal/50">
                  The key read out of the source field&rsquo;s JSON object. An array value is
                  joined with commas
                  {showOptions ? "; it must match one of this field's options" : ""}.
                </p>
              </Field>
            )}
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
