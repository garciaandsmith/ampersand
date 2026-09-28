"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { UserPlus } from "lucide-react";
import { Button, Field, Input, Label, Modal } from "@/components/ui";
import { inviteUserAction } from "./actions";

function InviteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="self-start" disabled={pending}>
      {pending ? "Sending…" : "Send invite"}
    </Button>
  );
}

export function InviteUserModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" /> Invite user
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Invite a user">
        <form
          action={async (formData) => {
            await inviteUserAction(formData);
            setOpen(false);
          }}
          className="flex flex-col gap-2"
        >
          <Field>
            <Label>Email</Label>
            <Input name="email" type="email" placeholder="name@company.com" required autoFocus />
          </Field>
          <p className="-mt-1 mb-2 text-xs text-charcoal/50">
            They&rsquo;ll get an email to set a password. Assign them to projects from
            the project list afterward — new users start with no access.
          </p>
          <InviteButton />
        </form>
      </Modal>
    </>
  );
}
