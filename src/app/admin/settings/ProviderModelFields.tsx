"use client";

import { useState } from "react";
import type { AiProviderPublic } from "@/lib/types";
import {
  DEFAULT_MAX_OUTPUT_TOKENS,
  EFFORT_LABELS,
  MODEL_CATALOG,
  findModelInfo,
} from "@/lib/ai/models";
import { Field, Input, Label, Select } from "@/components/ui";

/**
 * Cascading provider + model dropdowns, tied to an out-of-band `<form>` via
 * the `form` attribute so they can live in a table row or a plain card.
 * Reused for skill rows, the add-skill form, and the chat assistant setting.
 *
 * With `tuning` set, two more inputs follow — effort and output-token limit.
 * Their shape depends on the chosen model (per `MODEL_CATALOG`): unsupported
 * inputs are disabled, and a disabled input isn't submitted, so it saves as
 * "use the model's default".
 */
export function ProviderModelFields({
  formId,
  providers,
  initialProviderId,
  initialModel,
  layout,
  tuning,
}: {
  /** Set only when these selects live outside their `<form>` (a table row); omit when nested directly inside one. */
  formId?: string;
  providers: AiProviderPublic[];
  initialProviderId: string | null;
  initialModel: string | null;
  layout: "table" | "card";
  /** Show the effort + token-limit inputs, seeded with the skill's saved values. */
  tuning?: { effort: string | null; maxOutputTokens: number | null };
}) {
  const [providerId, setProviderId] = useState(initialProviderId ?? "");
  const [modelId, setModelId] = useState(initialModel ?? "");
  const [effort, setEffort] = useState(tuning?.effort ?? "");
  const [tokens, setTokens] = useState(tuning?.maxOutputTokens?.toString() ?? "");

  const provider = providers.find((p) => p.id === providerId);
  const models = provider ? MODEL_CATALOG[provider.type] : [];
  // A saved model that's no longer in the catalog shows as "select a model".
  const selectedModelId = models.some((m) => m.id === modelId) ? modelId : "";
  const modelInfo = provider ? findModelInfo(provider.type, selectedModelId) : undefined;

  const effortLevels = modelInfo?.effortLevels ?? [];
  const effortValue = (effortLevels as string[]).includes(effort) ? effort : "";
  const maxTokens = modelInfo?.maxOutputTokens ?? null;

  function handleProviderChange(id: string) {
    setProviderId(id);
    setModelId("");
    setEffort("");
    setTokens("");
  }

  function handleModelChange(id: string) {
    setModelId(id);
    const info = provider ? findModelInfo(provider.type, id) : undefined;
    if (!info || !(info.effortLevels as string[]).includes(effort)) setEffort("");
    if (!info || info.maxOutputTokens === null) setTokens("");
    else if (Number(tokens) > info.maxOutputTokens) setTokens(String(info.maxOutputTokens));
  }

  const providerSelect = (
    <Select
      form={formId}
      name="providerId"
      value={providerId}
      onChange={(e) => handleProviderChange(e.target.value)}
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
      value={selectedModelId}
      onChange={(e) => handleModelChange(e.target.value)}
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

  const effortUnavailable = !modelInfo || effortLevels.length === 0;
  const effortSelect = (
    <Select
      form={formId}
      name="effort"
      value={effortValue}
      onChange={(e) => setEffort(e.target.value)}
      disabled={effortUnavailable}
      className="min-w-[150px]"
    >
      {!modelInfo ? (
        <option value="">— pick a model first —</option>
      ) : effortLevels.length === 0 ? (
        <option value="">Not available for this model</option>
      ) : (
        <>
          <option value="">Model default</option>
          {effortLevels.map((level) => (
            <option key={level} value={level}>
              {EFFORT_LABELS[level]}
            </option>
          ))}
        </>
      )}
    </Select>
  );

  const tokensUnavailable = !modelInfo || maxTokens === null;
  const tokensInput = (
    <Input
      form={formId}
      name="maxOutputTokens"
      type="number"
      min={1}
      max={maxTokens ?? undefined}
      step={1}
      value={tokensUnavailable ? "" : tokens}
      onChange={(e) => setTokens(e.target.value)}
      disabled={tokensUnavailable}
      placeholder={
        !modelInfo
          ? "— pick a model first —"
          : maxTokens === null
            ? "Not available for this model"
            : `Default ${DEFAULT_MAX_OUTPUT_TOKENS.toLocaleString("en-US")}`
      }
      className="min-w-[130px]"
    />
  );

  if (layout === "table") {
    return (
      <>
        <td className="px-4 py-3">{providerSelect}</td>
        <td className="px-4 py-3">{modelSelect}</td>
        {tuning ? (
          <>
            <td className="px-4 py-3">{effortSelect}</td>
            <td className="px-4 py-3">{tokensInput}</td>
          </>
        ) : null}
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
      {tuning ? (
        <>
          <Field>
            <Label>Effort</Label>
            {effortSelect}
          </Field>
          <Field>
            <Label>Max output tokens</Label>
            {tokensInput}
            {maxTokens !== null && modelInfo ? (
              <p className="mt-1 text-xs text-charcoal/50">
                Up to {maxTokens.toLocaleString("en-US")}. Leave blank for the default (
                {DEFAULT_MAX_OUTPUT_TOKENS.toLocaleString("en-US")}).
              </p>
            ) : null}
          </Field>
        </>
      ) : null}
    </>
  );
}
