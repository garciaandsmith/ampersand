"use client";

import { useEffect, useState, useTransition } from "react";
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
import { deleteFieldAction, reorderFieldsAction } from "./actions";

function SortableFieldRow({
  field,
  fieldsById,
  isEditing,
  projectId,
  existingFields,
  onEdit,
  onStopEditing,
}: {
  field: FormField;
  fieldsById: Record<string, FormField>;
  isEditing: boolean;
  projectId: string;
  existingFields: FormField[];
  onEdit: () => void;
  onStopEditing: () => void;
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
          projectId={projectId}
          existingFields={existingFields}
          field={field}
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
        <form action={deleteFieldAction}>
          <input type="hidden" name="id" value={field.id} />
          <input type="hidden" name="projectId" value={projectId} />
          <Button variant="danger" type="submit" className="px-2 py-1 text-xs">
            Remove
          </Button>
        </form>
      </div>
    </div>
  );
}

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
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  useEffect(() => {
    setOrderedFields(fields);
  }, [fields]);

  const fieldsById = Object.fromEntries(fields.map((f) => [f.id, f]));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = orderedFields.findIndex((f) => f.id === active.id);
    const to = orderedFields.findIndex((f) => f.id === over.id);
    if (from === -1 || to === -1) return;

    const next = arrayMove(orderedFields, from, to);
    setOrderedFields(next);

    startTransition(() => {
      reorderFieldsAction(
        projectId,
        next.map((f) => f.id),
      );
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <DndContext
        id="form-builder-fields"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedFields.map((f) => f.id)}
          strategy={verticalListSortingStrategy}
        >
          {orderedFields.map((f) => (
            <SortableFieldRow
              key={f.id}
              field={f}
              fieldsById={fieldsById}
              isEditing={editingId === f.id}
              projectId={projectId}
              existingFields={fields}
              onEdit={() => {
                setAddOpen(false);
                setEditingId(f.id);
              }}
              onStopEditing={() => setEditingId(null)}
            />
          ))}
        </SortableContext>
      </DndContext>

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
