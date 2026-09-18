"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus } from "lucide-react";
import type { FormField } from "@/lib/types";
import { FIELD_DATA_TYPE_LABELS } from "@/lib/types";
import { Badge, Button, IconButton } from "@/components/ui";
import { FieldForm } from "./FieldForm";
import { saveFormAction } from "./actions";
import {
  createDraftId,
  toDraftField,
  toDraftFieldInput,
  type DraftField,
} from "./draft";

function SortableFieldRow({
  field,
  fieldsById,
  isEditing,
  existingFields,
  onEdit,
  onSubmitEdit,
  onStopEditing,
  onRemove,
}: {
  field: DraftField;
  fieldsById: Record<string, DraftField>;
  isEditing: boolean;
  existingFields: DraftField[];
  onEdit: () => void;
  onSubmitEdit: (values: Omit<DraftField, "id">) => void;
  onStopEditing: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    disabled: isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style}>
        <FieldForm
          existingFields={existingFields}
          field={field}
          onSubmit={onSubmitEdit}
          onCancel={onStopEditing}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-wrap items-center justify-between gap-3 rounded border bg-white px-4 py-3 ${
        isDragging ? "z-10 border-charcoal/30 shadow-lg" : "border-charcoal/15"
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="cursor-grab touch-none text-charcoal/30 hover:text-charcoal active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-sans text-sm font-extrabold">{field.name}</span>
          <Badge>{FIELD_DATA_TYPE_LABELS[field.data_type]}</Badge>
          <Badge color={field.input_type === "automated" ? "teal" : "charcoal"}>
            {field.input_type}
          </Badge>
          {field.input_type === "automated" && field.automation_source_field_id ? (
            <span className="text-xs text-charcoal/50">
              from &ldquo;{fieldsById[field.automation_source_field_id]?.name ?? "?"}&rdquo;
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <IconButton type="button" aria-label="Edit field" onClick={onEdit} className="h-7 w-7 p-0">
          <Pencil className="h-3.5 w-3.5" />
        </IconButton>
        <Button variant="danger" type="button" onClick={onRemove} className="px-2 py-1 text-xs">
          Remove
        </Button>
      </div>
    </div>
  );
}

function SaveButton({
  dirty,
  isSaving,
  onSave,
}: {
  dirty: boolean;
  isSaving: boolean;
  onSave: () => void;
}) {
  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={onSave}
        disabled={!dirty || isSaving}
        className={`inline-flex items-center justify-center rounded px-4 py-2 text-sm font-bold transition ${
          dirty
            ? "bg-yellow text-charcoal hover:brightness-95"
            : "cursor-not-allowed bg-charcoal/10 text-charcoal/40"
        }`}
      >
        {isSaving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

function sameField(a: DraftField, b: DraftField) {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.data_type === b.data_type &&
    a.input_type === b.input_type &&
    a.automation_source_field_id === b.automation_source_field_id &&
    a.automation_prompt === b.automation_prompt &&
    JSON.stringify(a.options) === JSON.stringify(b.options)
  );
}

export function FormBuilderList({
  projectId,
  fields,
}: {
  projectId: string;
  fields: FormField[];
}) {
  const savedFields = useMemo(() => fields.map(toDraftField), [fields]);
  const [draftFields, setDraftFields] = useState<DraftField[]>(savedFields);
  const [syncedFields, setSyncedFields] = useState(savedFields);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  // Reset the draft whenever the server state changes (only happens right
  // after this component's own save completes, since nothing else writes
  // to fields outside of saveFormAction).
  if (savedFields !== syncedFields) {
    setSyncedFields(savedFields);
    setDraftFields(savedFields);
  }

  const dirty =
    draftFields.length !== savedFields.length ||
    draftFields.some((f, i) => !sameField(f, savedFields[i]));

  useEffect(() => {
    if (!dirty) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const fieldsById = Object.fromEntries(draftFields.map((f) => [f.id, f]));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = draftFields.findIndex((f) => f.id === active.id);
    const to = draftFields.findIndex((f) => f.id === over.id);
    if (from === -1 || to === -1) return;

    setDraftFields(arrayMove(draftFields, from, to));
  }

  function handleAddField(values: Omit<DraftField, "id">) {
    setDraftFields((prev) => [...prev, { id: createDraftId(), ...values }]);
  }

  function handleUpdateField(id: string, values: Omit<DraftField, "id">) {
    setDraftFields((prev) => prev.map((f) => (f.id === id ? { id, ...values } : f)));
    setEditingId(null);
  }

  function handleRemoveField(id: string) {
    setDraftFields((prev) => prev.filter((f) => f.id !== id));
  }

  function handleSave() {
    startTransition(async () => {
      await saveFormAction(projectId, draftFields.map(toDraftFieldInput));
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <SaveButton dirty={dirty} isSaving={isSaving} onSave={handleSave} />

      <DndContext
        id="form-builder-fields"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={draftFields.map((f) => f.id)}
          strategy={verticalListSortingStrategy}
        >
          {draftFields.map((f) => (
            <SortableFieldRow
              key={f.id}
              field={f}
              fieldsById={fieldsById}
              isEditing={editingId === f.id}
              existingFields={draftFields}
              onEdit={() => {
                setAddOpen(false);
                setEditingId(f.id);
              }}
              onSubmitEdit={(values) => handleUpdateField(f.id, values)}
              onStopEditing={() => setEditingId(null)}
              onRemove={() => handleRemoveField(f.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {draftFields.length === 0 ? (
        <p className="rounded border border-dashed border-charcoal/25 px-4 py-6 text-center text-sm text-charcoal/50">
          No fields yet. Add your first one below.
        </p>
      ) : null}

      {addOpen ? (
        <FieldForm
          existingFields={draftFields}
          onSubmit={handleAddField}
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

      <SaveButton dirty={dirty} isSaving={isSaving} onSave={handleSave} />
    </div>
  );
}
