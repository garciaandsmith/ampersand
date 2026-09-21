"use client";

import { useState, useTransition } from "react";
import type { AiProviderPublic, EnabledModel } from "@/lib/types";
import { MODEL_GUESS_LABELS, type ModelGuess } from "@/lib/ai/models";
import { Badge, Button, Card, Input, Select, Table, Th } from "@/components/ui";
import { tableRowClass } from "@/lib/table";
import {
  listAllAvailableModelsAction,
  setEnabledModelsAction,
  type AllAvailableModels,
  type ProviderModelRow,
} from "./actions";

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString() : "—";
}

const rowKey = (r: ProviderModelRow) => `${r.providerId}::${r.model}`;

export function AvailableModelsExplorer({
  providers,
  enabledModels,
  inUse,
}: {
  providers: AiProviderPublic[];
  /** Models already in the dropdowns; these start out ticked. */
  enabledModels: EnabledModel[];
  /** Models a skill or the chat assistant currently uses; these can't be unticked. */
  inUse: EnabledModel[];
}) {
  const [result, setResult] = useState<AllAvailableModels | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<ModelGuess | "">("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isLoading, startLoading] = useTransition();
  const [isSaving, startSaving] = useTransition();

  if (providers.length === 0) return null;

  const inUseKeys = new Set(inUse.map((m) => `${m.provider_id}::${m.model}`));
  const isLocked = (r: ProviderModelRow) => inUseKeys.has(rowKey(r));
  const isTicked = (r: ProviderModelRow) => isLocked(r) || checked.has(rowKey(r));

  function handleLoad() {
    setError(null);
    setResult(null);
    setCopied(false);
    setSaved(false);
    startLoading(async () => {
      try {
        setResult(await listAllAvailableModelsAction());
        setChecked(new Set(enabledModels.map((m) => `${m.provider_id}::${m.model}`)));
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function toggle(key: string) {
    setSaved(false);
    setChecked((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  function handleSave() {
    if (!result) return;
    setError(null);
    const selections = result.rows
      .filter(isTicked)
      .map((r) => ({ provider_id: r.providerId, model: r.model }));
    startSaving(async () => {
      try {
        await setEnabledModelsAction(result.loadedProviderIds, selections);
        setSaved(true);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  async function handleCopy() {
    if (!result) return;
    // Tab-separated, so it pastes cleanly into a spreadsheet as well as a chat or doc.
    const text = [
      ["Provider", "Model", "Type (guessed)", "Capabilities", "Date"],
      ...result.rows
        .filter((r) => !r.notListed)
        .map((r) => [r.provider, r.model, MODEL_GUESS_LABELS[r.guess], r.capabilities.join(", "), formatDate(r.createdAt)]),
    ]
      .map((cols) => cols.join("\t"))
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy to the clipboard — your browser blocked it.");
    }
  }

  const needle = filter.trim().toLowerCase();
  const visibleRows = result
    ? result.rows.filter(
        (r) =>
          (!typeFilter || r.guess === typeFilter) &&
          (!needle || r.model.toLowerCase().includes(needle) || r.provider.toLowerCase().includes(needle)),
      )
    : [];
  const pickedCount = result ? result.rows.filter(isTicked).length : 0;

  return (
    <Card>
      <h3 className="mb-1 font-sans text-sm font-extrabold">Available models</h3>
      <p className="mb-3 max-w-2xl text-xs text-charcoal/50">
        The live list of models every connected provider&rsquo;s API key can actually access. Tick
        the ones you want in the provider/model dropdowns above, then save. Models a skill or the
        chat assistant uses stay ticked. Models outside our capability catalog use the
        provider&rsquo;s defaults for effort and output tokens, since we don&rsquo;t know what
        they accept. The Type column is a guess from the model&rsquo;s name (providers
        don&rsquo;t say what a model does) — use it to find candidates; a skill&rsquo;s own
        Type is what decides how it is called.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" onClick={handleLoad} disabled={isLoading}>
          {isLoading ? "Loading…" : "Load models"}
        </Button>
        {result && result.rows.length > 0 ? (
          <>
            <Button type="button" variant="ghost" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy text"}
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving…" : `Save dropdown selection (${pickedCount})`}
            </Button>
            {saved ? <span className="text-xs text-charcoal/60">Saved — dropdowns updated.</span> : null}
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ModelGuess | "")}
              aria-label="Filter by type"
              className="ml-auto max-w-[160px]"
            >
              <option value="">All types</option>
              {(Object.keys(MODEL_GUESS_LABELS) as ModelGuess[]).map((g) => (
                <option key={g} value={g}>
                  {MODEL_GUESS_LABELS[g]}
                </option>
              ))}
            </Select>
            <Input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter models…"
              className="max-w-[220px]"
            />
          </>
        ) : null}
      </div>

      {error ? (
        <p className="mb-3 rounded border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
          {error}
        </p>
      ) : null}

      {result?.errors.map((e) => (
        <p
          key={e.provider}
          className="mb-3 rounded border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral"
        >
          {e.provider}: {e.message}
        </p>
      ))}

      {result ? (
        result.rows.length === 0 ? (
          <p className="text-sm text-charcoal/50">No models returned.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>In dropdowns</Th>
                <Th>Provider</Th>
                <Th>Model</Th>
                <Th>Type</Th>
                <Th>Date</Th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-charcoal/50">
                    No models match the current filters.
                  </td>
                </tr>
              ) : (
                visibleRows.map((r, i) => {
                  const locked = isLocked(r);
                  return (
                    <tr key={rowKey(r)} className={tableRowClass(i)}>
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={isTicked(r)}
                          disabled={locked}
                          onChange={() => toggle(rowKey(r))}
                          aria-label={`Show ${r.model} in the dropdowns`}
                        />
                      </td>
                      <td className="px-4 py-2">{r.provider}</td>
                      <td className="px-4 py-2 font-mono text-xs">
                        {r.model}{" "}
                        {locked ? <Badge color="teal">in use</Badge> : null}
                        {r.notListed ? <Badge color="yellow">not in live list</Badge> : null}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className="text-xs text-charcoal/70"
                          title={
                            r.capabilities.length
                              ? "Type guessed from the model's name. Capabilities are reported by the provider."
                              : "Guessed from the model's name — the provider's list doesn't say."
                          }
                        >
                          {MODEL_GUESS_LABELS[r.guess]}
                          <span className="text-charcoal/40"> (guessed)</span>
                        </span>
                        {r.capabilities.length ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {r.capabilities.map((c) => (
                              <Badge key={c}>{c}</Badge>
                            ))}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 text-charcoal/60">{formatDate(r.createdAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        )
      ) : null}
    </Card>
  );
}
