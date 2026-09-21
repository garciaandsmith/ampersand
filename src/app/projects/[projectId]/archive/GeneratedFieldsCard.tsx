"use client";

import { useState } from "react";
import { ListChecks, Sparkles } from "lucide-react";
import type { FormField } from "@/lib/types";
import { Badge, Button, Card, Field, IconButton, Label, Textarea } from "@/components/ui";

/**
 * The "Generated fields" card shared by the new-record and edit forms.
 * Fields can be generated one at a time (sparkle button) or, via
 * "Select and generate", in a hand-picked batch.
 */
export function GeneratedFieldsCard({
  fields,
  sourceNames,
  values,
  errors,
  generatingIds,
  disabled,
  disabledHint,
  placeholder,
  onValueChange,
  onGenerate,
}: {
  fields: FormField[];
  /** Source field name per automated field id, shown as "(from …)". */
  sourceNames: Record<string, string>;
  values: Record<string, string>;
  errors: Record<string, string>;
  generatingIds: string[];
  /** Blocks all generation (nothing to read yet, an upload in progress, …). */
  disabled: boolean;
  disabledHint?: string;
  placeholder?: string;
  onValueChange: (fieldId: string, value: string) => void;
  onGenerate: (fieldIds: string[]) => void;
}) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const busy = generatingIds.length > 0;
  const overwriteCount = [...selected].filter((id) => values[id]?.trim()).length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startSelecting() {
    setSelected(new Set());
    setSelecting(true);
  }

  function runSelected() {
    onGenerate([...selected]);
    setSelecting(false);
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-sans text-sm font-extrabold">
          Generated fields <Badge color="teal">AI</Badge>
        </h3>
        {fields.length === 0 ? null : selecting ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="text-xs font-bold text-charcoal/60 underline hover:text-charcoal"
              onClick={() => setSelected(new Set(fields.map((f) => f.id)))}
            >
              All
            </button>
            <button
              type="button"
              className="text-xs font-bold text-charcoal/60 underline hover:text-charcoal"
              onClick={() => setSelected(new Set(fields.filter((f) => !values[f.id]?.trim()).map((f) => f.id)))}
            >
              Empty only
            </button>
            <button
              type="button"
              className="text-xs font-bold text-charcoal/60 underline hover:text-charcoal"
              onClick={() => setSelected(new Set())}
            >
              None
            </button>
            <Button variant="ghost" type="button" onClick={() => setSelecting(false)}>
              Cancel
            </Button>
            <Button variant="secondary" type="button" onClick={runSelected} disabled={selected.size === 0 || disabled || busy}>
              <Sparkles className="h-4 w-4" />
              Generate selected ({selected.size})
            </Button>
          </div>
        ) : (
          <Button variant="secondary" type="button" onClick={startSelecting} disabled={disabled || busy} title={disabled ? disabledHint : undefined}>
            <ListChecks className="h-4 w-4" />
            {busy ? "Generating…" : "Select and generate"}
          </Button>
        )}
      </div>

      {selecting && overwriteCount > 0 ? (
        <p className="mb-4 rounded border border-yellow/60 bg-yellow/15 px-3 py-2 text-xs text-charcoal">
          {overwriteCount} selected {overwriteCount === 1 ? "field already has" : "fields already have"} content that will be replaced.
        </p>
      ) : null}

      {fields.length === 0 ? (
        <p className="text-sm text-charcoal/50">
          No automated fields defined yet. Add some in the Form Builder.
        </p>
      ) : (
        fields.map((f) => {
          const isGenerating = generatingIds.includes(f.id);
          return (
            <Field key={f.id}>
              <div className="mb-1 flex items-center justify-between">
                {selecting ? (
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected.has(f.id)}
                      onChange={() => toggle(f.id)}
                      className="h-4 w-4 accent-charcoal"
                    />
                    <span className="text-xs font-bold uppercase tracking-wide text-charcoal/60">
                      {f.name}
                      {sourceNames[f.id] ? (
                        <span className="ml-1 font-normal normal-case text-charcoal/40">(from {sourceNames[f.id]})</span>
                      ) : null}
                    </span>
                  </label>
                ) : (
                  <>
                    <Label>
                      {f.name}
                      {sourceNames[f.id] ? (
                        <span className="ml-1 font-normal normal-case text-charcoal/40">(from {sourceNames[f.id]})</span>
                      ) : null}
                    </Label>
                    <IconButton
                      type="button"
                      title={disabled && disabledHint ? disabledHint : "Generate with AI"}
                      aria-label={`Generate ${f.name} with AI`}
                      onClick={() => onGenerate([f.id])}
                      disabled={disabled || busy}
                      className={isGenerating ? "animate-pulse" : ""}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </IconButton>
                  </>
                )}
              </div>
              <Textarea
                rows={2}
                value={values[f.id] ?? ""}
                onChange={(e) => onValueChange(f.id, e.target.value)}
                placeholder={isGenerating ? "Generating…" : placeholder}
                className={isGenerating ? "animate-pulse" : ""}
              />
              {errors[f.id] ? <p className="mt-1 text-xs text-coral">{errors[f.id]}</p> : null}
            </Field>
          );
        })
      )}
    </Card>
  );
}
