"use client";

import { Button } from "@/components/ui";

/**
 * A delete button that asks for confirmation (native browser popup) before
 * submitting its server action. Cancelling leaves everything untouched.
 */
export function ConfirmDeleteButton({
  action,
  id,
  confirmMessage,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  confirmMessage: string;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button variant="danger" type="submit" className={className}>
        Delete
      </Button>
    </form>
  );
}
