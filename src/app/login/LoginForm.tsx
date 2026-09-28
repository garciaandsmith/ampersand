"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input, Label } from "@/components/ui";
import { sendMagicLinkAction, signInWithPasswordAction } from "./actions";

export function LoginForm() {
  const [mode, setMode] = useState<"password" | "magic-link">("password");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      if (mode === "password") {
        const result = await signInWithPasswordAction(formData);
        if (result?.error) setError(result.error);
      } else {
        const result = await sendMagicLinkAction(formData);
        if (result?.error) setError(result.error);
        else setSent(true);
      }
    });
  }

  if (sent) {
    return (
      <p className="text-sm text-charcoal/70">
        Check your email for a sign-in link.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Field>
        <Label>Email</Label>
        <Input name="email" type="email" required autoFocus autoComplete="email" />
      </Field>

      {mode === "password" ? (
        <Field>
          <Label>Password</Label>
          <Input name="password" type="password" required autoComplete="current-password" />
        </Field>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-coral">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="mt-2">
        {isPending ? "…" : mode === "password" ? "Sign in" : "Email me a link"}
      </Button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "password" ? "magic-link" : "password");
          setError(null);
        }}
        className="mt-1 text-center text-xs font-semibold text-charcoal/50 underline hover:text-charcoal"
      >
        {mode === "password" ? "Email me a sign-in link instead" : "Sign in with a password instead"}
      </button>
    </form>
  );
}
