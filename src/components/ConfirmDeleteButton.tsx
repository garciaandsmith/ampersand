"use client";

import { Button } from "@/components/ui";

/**
 * A delete button that asks for confirmation (native browser popup) before
 * submitting its server action. Cancelling leaves everything untouched.
 */
export function ConfirmDeleteButton({
  action,
  fields,
  confirmMessage,
  label = "Delete",
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  /** Hidden form fields the action needs, e.g. `{ id }` or `{ projectId, itemId }`. */
  fields: Record<string, string>;
  confirmMessage: string;
  label?: string;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button variant="danger" type="submit" className={className}>
        {label}
      </Button>
    </form>
  );
}
