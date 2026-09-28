"use client";

import { Fragment, useState } from "react";
import type { AiProviderPublic, AiSkill, EnabledModel, SkillKind } from "@/lib/types";
import { SKILL_INSTRUCTIONS_MAX_LENGTH } from "@/lib/types";
import { Button, Field, Input, Label, Textarea } from "@/components/ui";
import { tableRowClass } from "@/lib/table";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { ProviderModelFields } from "./ProviderModelFields";
import { deleteSkillAction } from "./actions";

const INSTRUCTIONS_HINT = `Markdown is fine. Sent to the model with every call, so keep it focused (limit ${SKILL_INSTRUCTIONS_MAX_LENGTH.toLocaleString("en-US")} characters). The field's own prompt still says what to write; these say how.`;
const INSTRUCTIONS_PLACEHOLDER =
  "Standing instructions for this skill, in markdown — e.g. an SEO/GEO writing guide.";

/**
 * One skill's two table rows (recipe + instructions). Client-side so the
 * instructions box can follow the Type dropdown: transcription skills take none.
 * The row's inputs belong to the page's `<form id={formId}>` via the `form` attribute.
 */
export function SkillRows({
  skill,
  index,
  formId,
  providers,
  enabledModels,
}: {
  skill: AiSkill;
  index: number;
  formId: string;
  providers: AiProviderPublic[];
  enabledModels: EnabledModel[];
}) {
  const [kind, setKind] = useState<SkillKind>(skill.kind ?? "chat");

  return (
    <Fragment>
      <tr className={index % 2 === 1 ? "bg-charcoal/[0.02]" : ""}>
        <td className="px-4 py-3">
          <Input form={formId} name="name" defaultValue={skill.name} required className="min-w-[160px]" />
        </td>
        <ProviderModelFields
          formId={formId}
          providers={providers}
          enabledModels={enabledModels}
          initialProviderId={skill.provider_id}
          initialModel={skill.model}
          layout="table"
          tuning={{ effort: skill.effort, maxOutputTokens: skill.max_output_tokens }}
          initialKind={skill.kind ?? "chat"}
          onKindChange={setKind}
        />
        <td className="px-4 py-3 text-right">
          <div className="flex justify-end gap-2">
            <Button form={formId} type="submit" variant="ghost" className="px-3 py-1 text-xs">
              Save
            </Button>
            <ConfirmDeleteButton
              action={deleteSkillAction}
              fields={{ id: skill.id }}
              confirmMessage={`Delete the skill "${skill.name}"? Fields that use it will need another skill.`}
              className="px-3 py-1 text-xs"
            />
          </div>
        </td>
      </tr>
      <tr className={tableRowClass(index)}>
        <td colSpan={7} className="px-4 pb-3">
          {kind === "chat" ? (
            <details>
              <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-charcoal/60">
                Instructions
                {skill.instructions
                  ? ` — ${skill.instructions.length.toLocaleString("en-US")} characters`
                  : " — none"}
              </summary>
              <Textarea
                form={formId}
                name="instructions"
                defaultValue={skill.instructions ?? ""}
                rows={8}
                maxLength={SKILL_INSTRUCTIONS_MAX_LENGTH}
                placeholder={INSTRUCTIONS_PLACEHOLDER}
                className="mt-2 font-mono text-xs"
              />
              <p className="mt-1 text-xs text-charcoal/50">{INSTRUCTIONS_HINT}</p>
            </details>
          ) : (
            <p className="text-xs text-charcoal/50">
              Transcription skills take no instructions, effort or token limit.
            </p>
          )}
        </td>
      </tr>
    </Fragment>
  );
}

/** The "Add a skill" fields after the name: type/provider/model/tuning, and instructions for chat skills. */
export function AddSkillFields({
  providers,
  enabledModels,
}: {
  providers: AiProviderPublic[];
  enabledModels: EnabledModel[];
}) {
  const [kind, setKind] = useState<SkillKind>("chat");

  return (
    <>
      <ProviderModelFields
        providers={providers}
        enabledModels={enabledModels}
        initialProviderId={null}
        initialModel={null}
        layout="card"
        tuning={{ effort: null, maxOutputTokens: null }}
        initialKind="chat"
        onKindChange={setKind}
      />
      {kind === "chat" ? (
        <Field>
          <Label>Instructions (optional)</Label>
          <Textarea
            name="instructions"
            rows={6}
            maxLength={SKILL_INSTRUCTIONS_MAX_LENGTH}
            placeholder={INSTRUCTIONS_PLACEHOLDER}
            className="font-mono text-xs"
          />
          <p className="mt-1 text-xs text-charcoal/50">{INSTRUCTIONS_HINT}</p>
        </Field>
      ) : null}
    </>
  );
}
