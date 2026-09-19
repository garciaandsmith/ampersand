"use client";

import { useState } from "react";
import type { AiProviderPublic } from "@/lib/types";
import { MODEL_CATALOG } from "@/lib/ai/models";
import { Field, Label, Select } from "@/components/ui";

/**
 * Cascading provider + model dropdowns, tied to an out-of-band `<form>` via
 * the `form` attribute so they can live in a table row or a plain card.
 * Reused for skill rows, the add-skill form, and the chat assistant setting.
 */
export function ProviderModelFields({
  formId,
  providers,
  initialProviderId,
  initialModel,
  layout,
}: {
  /** Set only when these selects live outside their `<form>` (a table row); omit when nested directly inside one. */
  formId?: string;
  providers: AiProviderPublic[];
  initialProviderId: string | null;
  initialModel: string | null;
  layout: "table" | "card";
}) {
  const [providerId, setProviderId] = useState(initialProviderId ?? "");
  const provider = providers.find((p) => p.id === providerId);
  const models = provider ? MODEL_CATALOG[provider.type] : [];
  const currentModelStillValid = models.some((m) => m.id === initialModel);

  const providerSelect = (
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
  );

  const modelSelect = (
    <Select
      form={formId}
      name="model"
      key={providerId}
      defaultValue={currentModelStillValid ? initialModel ?? "" : ""}
      className="min-w-[220px]"
      disabled={!provider}
    >
      <option value="">{provider ? "— select a model —" : "— pick a provider first —"}</option>
      {models.map((m) => (
        <option key={m.id} value={m.id}>
          {m.label}
        </option>
      ))}
    </Select>
  );

  if (layout === "table") {
    return (
      <>
        <td className="px-4 py-3">{providerSelect}</td>
        <td className="px-4 py-3">{modelSelect}</td>
      </>
    );
  }

  return (
    <>
      <Field>
        <Label>Provider</Label>
        {providerSelect}
      </Field>
      <Field>
        <Label>Model</Label>
        {modelSelect}
      </Field>
    </>
  );
}
