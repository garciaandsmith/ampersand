"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { createProjectAction } from "@/app/admin/projects/actions";
import { Button, Field, Input, Label, Modal } from "@/components/ui";

export function NewProjectModal({
  trigger,
}: {
  /** Renders the trigger button's contents; defaults to "+ New Project". */
  trigger?: (open: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {trigger ? (
        trigger(() => setOpen(true))
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New Project
        </Button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New project">
        <form action={createProjectAction} className="flex flex-col gap-2">
          <Field>
            <Label>Name</Label>
            <Input name="name" placeholder="Client / project name" required autoFocus />
          </Field>
          <Field>
            <Label>Users</Label>
            <Input name="users" placeholder="e.g. maria@agency.com, jon@client.com" />
          </Field>
          <Button type="submit" className="self-start">
            Create project
          </Button>
        </form>
      </Modal>
    </>
  );
}
