"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input, Label } from "@/components/ui";
import { setPasswordAction } from "./actions";

export function SetPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await setPasswordAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Field>
        <Label>New password</Label>
        <Input name="password" type="password" required minLength={8} autoFocus autoComplete="new-password" />
      </Field>
      <Field>
        <Label>Confirm password</Label>
        <Input name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      </Field>

      {error ? (
        <p role="alert" className="text-sm text-coral">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="mt-2">
        {isPending ? "Saving…" : "Set password"}
      </Button>
    </form>
  );
}
