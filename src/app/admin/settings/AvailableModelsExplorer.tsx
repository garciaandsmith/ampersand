"use client";

import { useState, useTransition } from "react";
import type { AvailableModel } from "@/lib/ai/client";
import type { AiProviderPublic } from "@/lib/types";
import { Button, Card, Select, Table, Th } from "@/components/ui";
import { tableRowClass } from "@/lib/table";
import { listAvailableModelsAction } from "./actions";

export function AvailableModelsExplorer({ providers }: { providers: AiProviderPublic[] }) {
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "");
  const [models, setModels] = useState<AvailableModel[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startLoading] = useTransition();

  if (providers.length === 0) return null;

  function handleLoad() {
    setError(null);
    setModels(null);
    startLoading(async () => {
      try {
        setModels(await listAvailableModelsAction(providerId));
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <Card>
      <h3 className="mb-1 font-sans text-sm font-extrabold">Available models</h3>
      <p className="mb-3 text-xs text-charcoal/50">
        The live list of models this provider&rsquo;s API key can actually access — handy for
        spotting models not yet covered by our capability catalog.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select
          value={providerId}
          onChange={(e) => {
            setProviderId(e.target.value);
            setModels(null);
            setError(null);
          }}
          className="min-w-[220px]"
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.type})
            </option>
          ))}
        </Select>
        <Button type="button" variant="secondary" onClick={handleLoad} disabled={isLoading}>
          {isLoading ? "Loading…" : "Load models"}
        </Button>
      </div>

      {error ? (
        <p className="mb-3 rounded border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
          {error}
        </p>
      ) : null}

      {models ? (
        models.length === 0 ? (
          <p className="text-sm text-charcoal/50">No models returned for this provider.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Model ID</Th>
                <Th>Released</Th>
                <Th>Reported capabilities</Th>
              </tr>
            </thead>
            <tbody>
              {models.map((m, i) => (
                <tr key={m.id} className={tableRowClass(i)}>
                  <td className="px-4 py-2 font-mono text-xs">{m.id}</td>
                  <td className="px-4 py-2 text-charcoal/60">
                    {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-2 text-charcoal/60">
                    {m.knownCapabilities?.length ? m.knownCapabilities.join(", ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )
      ) : null}
    </Card>
  );
}
