"use client";

import { useState } from "react";
import type { AiProviderPublic, AiSkillAssignment } from "@/lib/types";
import { modelsForSkill } from "@/lib/ai/models";
import { Select } from "@/components/ui";

/**
 * The provider + model dropdowns for one skill row in Admin > Settings.
 * The model list cascades off the selected provider's type and is filtered
 * to models whose capabilities include the skill's required capability.
 * Both selects are tied to the row's hidden `<form>` via the `form` attribute
 * (see page.tsx), so this only needs to own the cascading UI state.
 */
export function SkillProviderModelFields({
  formId,
  providers,
  skill,
}: {
  formId: string;
  providers: AiProviderPublic[];
  skill: AiSkillAssignment;
}) {
  const [providerId, setProviderId] = useState(skill.provider_id ?? "");
  const provider = providers.find((p) => p.id === providerId);
  const models = provider ? modelsForSkill(provider.type, skill.skill_key) : [];
  const currentModelStillValid = models.some((m) => m.id === skill.model);

  return (
    <>
      <td className="px-4 py-3">
        <Select
          form={formId}
          name="providerId"
          value={providerId}
          onChange={(e) => setProviderId(e.target.value)}
          className="min-w-[160px]"
        >
          <option value="">— none —</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.type})
            </option>
          ))}
        </Select>
      </td>
      <td className="px-4 py-3">
        <Select
          form={formId}
          name="model"
          key={providerId}
          defaultValue={currentModelStillValid ? skill.model ?? "" : ""}
          className="min-w-[220px]"
          disabled={!provider}
        >
          <option value="">
            {provider ? "— select a model —" : "— pick a provider first —"}
          </option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
      </td>
    </>
  );
}
