"use client";

import { useTransition, type FormHTMLAttributes } from "react";

/**
 * A `<form>` that runs a server action on submit *without* React 19's
 * automatic form reset.
 *
 * With `<form action={fn}>`, React resets every field to its initial value once
 * the action finishes. For the settings forms here (provider/model dropdowns
 * whose options depend on each other, tied to the form via the `form`
 * attribute) that reset blanks the selections right after a successful save.
 * Submitting through `onSubmit` avoids it; the page still refreshes with the
 * saved data because the actions call `revalidatePath`.
 *
 * Set `resetOnSuccess` for "add" forms that should clear after saving.
 */
export function ActionForm({
  action,
  resetOnSuccess = false,
  ...props
}: Omit<FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit"> & {
  action: (formData: FormData) => void | Promise<void>;
  resetOnSuccess?: boolean;
}) {
  const [, startTransition] = useTransition();

  return (
    <form
      {...props}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        // Includes fields tied to this form from elsewhere via the `form` attribute.
        const formData = new FormData(form);
        startTransition(async () => {
          await action(formData);
          if (resetOnSuccess) form.reset();
        });
      }}
    />
  );
}
