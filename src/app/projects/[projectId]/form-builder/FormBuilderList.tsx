"use client";

import { useEffect, useState, useTransition } from "react";
import { GripVertical, Pencil, Plus } from "lucide-react";
import type { FormField } from "@/lib/types";
import { FIELD_DATA_TYPE_LABELS } from "@/lib/types";
import { Badge, Button, IconButton } from "@/components/ui";
import { FieldForm } from "./FieldForm";
import { deleteFieldAction, reorderFieldsAction } from "./actions";

export function FormBuilderList({
  projectId,
  fields,
}: {
  projectId: string;
  fields: FormField[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [orderedFields, setOrderedFields] = useState(fields);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setOrderedFields(fields);
  }, [fields]);

  const fieldsById = Object.fromEntries(fields.map((f) => [f.id, f]));

  function handleDrop(targetId: string) {
    const sourceId = dragId;
    setDragId(null);
    setDragOverId(null);
    if (!sourceId || sourceId === targetId) return;

    setOrderedFields((prev) => {
      const from = prev.findIndex((f) => f.id === sourceId);
      const to = prev.findIndex((f) => f.id === targetId);
      if (from === -1 || to === -1) return prev;

      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);

      startTransition(() => {
        reorderFieldsAction(projectId, next.map((f) => f.id));
      });

      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {orderedFields.map((f) =>
        editingId === f.id ? (
          <FieldForm
            key={f.id}
            projectId={projectId}
            existingFields={fields}
            field={f}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div
            key={f.id}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragOverId !== f.id) setDragOverId(f.id);
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(f.id);
            }}
            className={`flex flex-wrap items-center justify-between gap-3 rounded border bg-white px-4 py-3 transition ${
              dragOverId === f.id && dragId && dragId !== f.id
                ? "border-teal bg-teal/5"
                : "border-charcoal/15"
            } ${dragId === f.id ? "opacity-40" : ""}`}
          >
            <div className="flex items-center gap-3">
              <span
                draggable
                onDragStart={(e) => {
                  setDragId(f.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", f.id);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setDragOverId(null);
                }}
                aria-label="Drag to reorder"
                className="cursor-grab text-charcoal/30 hover:text-charcoal active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4" />
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-sans text-sm font-extrabold">{f.name}</span>
                <Badge>{FIELD_DATA_TYPE_LABELS[f.data_type]}</Badge>
                <Badge color={f.input_type === "automated" ? "teal" : "charcoal"}>
                  {f.input_type}
                </Badge>
                {f.input_type === "automated" && f.automation_source_field_id ? (
                  <span className="text-xs text-charcoal/50">
                    from &ldquo;{fieldsById[f.automation_source_field_id]?.name ?? "?"}&rdquo;
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <IconButton
                type="button"
                aria-label="Edit field"
                onClick={() => {
                  setAddOpen(false);
                  setEditingId(f.id);
                }}
                className="h-7 w-7 p-0"
              >
                <Pencil className="h-3.5 w-3.5" />
              </IconButton>
              <form action={deleteFieldAction}>
                <input type="hidden" name="id" value={f.id} />
                <input type="hidden" name="projectId" value={projectId} />
                <Button variant="danger" type="submit" className="px-2 py-1 text-xs">
                  Remove
                </Button>
              </form>
            </div>
          </div>
        ),
      )}

      {fields.length === 0 ? (
        <p className="rounded border border-dashed border-charcoal/25 px-4 py-6 text-center text-sm text-charcoal/50">
          No fields yet. Add your first one below.
        </p>
      ) : null}

      {addOpen ? (
        <FieldForm
          key={fields.length}
          projectId={projectId}
          existingFields={fields}
          onCancel={() => setAddOpen(false)}
        />
      ) : (
        <Button
          variant="ghost"
          onClick={() => {
            setEditingId(null);
            setAddOpen(true);
          }}
          className="self-start"
        >
          <Plus className="h-4 w-4" /> New field
        </Button>
      )}
    </div>
  );
}
