"use client";

import { useState } from "react";
import { SKILL_KIND_LABELS, type AiProviderPublic, type EnabledModel, type SkillKind } from "@/lib/types";
import {
  DEFAULT_MAX_OUTPUT_TOKENS,
  EFFORT_LABELS,
  guessModelKind,
  modelFitsSkillKind,
  modelOptions,
} from "@/lib/ai/models";
import { Field, Input, Label, Select } from "@/components/ui";

/**
 * Cascading provider + model dropdowns, tied to an out-of-band `<form>` via
 * the `form` attribute so they can live in a table row or a plain card.
 * Reused for skill rows, the add-skill form, and the chat assistant setting.
 *
 * With `tuning` set (skills), a Type dropdown comes first and two more inputs
 * follow — effort and output-token limit. Type is the skill's job (chat or
 * transcription) and decides which API is called; it steers the model list
 * (models that look right first, the rest marked) and switches effort/tokens
 * off, since transcription models take neither. Otherwise their shape depends
 * on the chosen model (per `MODEL_CATALOG`): unsupported inputs are disabled,
 * and a disabled input isn't submitted, so it saves as "use the model's default".
 */
export function ProviderModelFields({
  formId,
  providers,
  enabledModels,
  initialProviderId,
  initialModel,
  layout,
  tuning,
  initialKind,
  onKindChange,
}: {
  /** Set only when these selects live outside their `<form>` (a table row); omit when nested directly inside one. */
  formId?: string;
  providers: AiProviderPublic[];
  /** Models the admin ticked in "Available models"; these are the dropdown's options. */
  enabledModels: EnabledModel[];
  initialProviderId: string | null;
  initialModel: string | null;
  layout: "table" | "card";
  /** Show the effort + token-limit inputs, seeded with the skill's saved values. */
  tuning?: { effort: string | null; maxOutputTokens: number | null };
  /** Skills only: the skill's saved type. Omit for the chat assistant, which is always chat. */
  initialKind?: SkillKind;
  /** Lets the parent react to the type (e.g. hide the instructions, which transcription skills don't use). */
  onKindChange?: (kind: SkillKind) => void;
}) {
  const [providerId, setProviderId] = useState(initialProviderId ?? "");
  const [modelId, setModelId] = useState(initialModel ?? "");
  const [effort, setEffort] = useState(tuning?.effort ?? "");
  const [tokens, setTokens] = useState(tuning?.maxOutputTokens?.toString() ?? "");
  const [kind, setKind] = useState<SkillKind>(initialKind ?? "chat");
  const isTranscription = kind === "transcription";

  const provider = providers.find((p) => p.id === providerId);
  const models = provider
    ? modelOptions(
        provider.type,
        enabledModels.filter((m) => m.provider_id === provider.id).map((m) => m.model),
      )
    : [];
  // A saved model that isn't ticked shows as "select a model".
  const selectedModelId = models.some((m) => m.id === modelId) ? modelId : "";
  const modelInfo = models.find((m) => m.id === selectedModelId);

  // Models that look right for the type come first; the rest stay selectable, just marked.
  const fitting = initialKind ? models.filter((m) => modelFitsSkillKind(kind, m.id)) : models;
  const notFitting = initialKind ? models.filter((m) => !modelFitsSkillKind(kind, m.id)) : [];

  const effortLevels = isTranscription ? [] : (modelInfo?.effortLevels ?? []);
  const effortValue = (effortLevels as string[]).includes(effort) ? effort : "";
  const maxTokens = isTranscription ? null : (modelInfo?.maxOutputTokens ?? null);

  function handleProviderChange(id: string) {
    setProviderId(id);
    setModelId("");
    setEffort("");
    setTokens("");
  }

  function changeKind(next: SkillKind) {
    setKind(next);
    onKindChange?.(next);
  }

  function handleKindChange(next: SkillKind) {
    changeKind(next);
    // Transcription is OpenAI-only for now; drop an incompatible provider rather than save a broken pair.
    if (next === "transcription" && provider?.type !== "openai") {
      setProviderId("");
      setModelId("");
    }
    setEffort("");
    setTokens("");
  }

  function handleModelChange(id: string) {
    setModelId(id);
    // A suggestion, not a rule: a model that plainly transcribes pre-selects the Transcription type.
    if (initialKind && kind === "chat" && guessModelKind(id) === "transcription") changeKind("transcription");
    const info = models.find((m) => m.id === id);
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
        <option key={p.id} value={p.id} disabled={isTranscription && p.type !== "openai"}>
          {p.name} ({p.type}){isTranscription && p.type !== "openai" ? " — no transcription" : ""}
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
      {fitting.map((m) => (
        <option key={m.id} value={m.id}>
          {m.label}
        </option>
      ))}
      {notFitting.length > 0 ? (
        <optgroup label={`Don't look like ${isTranscription ? "transcription" : "chat"} models`}>
          {notFitting.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </optgroup>
      ) : null}
    </Select>
  );

  const kindSelect = (
    <Select
      form={formId}
      name="kind"
      value={kind}
      onChange={(e) => handleKindChange(e.target.value as SkillKind)}
      className="min-w-[190px]"
    >
      {(Object.keys(SKILL_KIND_LABELS) as SkillKind[]).map((k) => (
        <option key={k} value={k}>
          {SKILL_KIND_LABELS[k]}
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
      {isTranscription ? (
        <option value="">Not used for transcription</option>
      ) : !modelInfo ? (
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
        isTranscription
          ? "Not used for transcription"
          : !modelInfo
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
        {initialKind ? <td className="px-4 py-3">{kindSelect}</td> : null}
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
      {initialKind ? (
        <Field>
          <Label>Type</Label>
          {kindSelect}
          <p className="mt-1 text-xs text-charcoal/50">
            {isTranscription
              ? "Turns an audio or video file into text. Transcription models take no effort, token limit or instructions."
              : "Reads text, images and PDFs and writes text."}
          </p>
        </Field>
      ) : null}
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
