"use client";

import Link from "next/link";
import { Smartphone, Trash2 } from "lucide-react";
import type { FormView } from "@/lib/types";
import { Badge, Button, EmptyState, IconButton, Table, Th } from "@/components/ui";
import { tableRowClass } from "@/lib/table";
import { deleteFormViewAction } from "./actions";

function DeleteFormViewButton({
  projectId,
  formViewId,
  name,
}: {
  projectId: string;
  formViewId: string;
  name: string;
}) {
  return (
    <form
      action={deleteFormViewAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Delete the Form View "${name}"? Records already created from it stay in the archive.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="formViewId" value={formViewId} />
      <IconButton variant="danger" type="submit" title="Delete Form View">
        <Trash2 className="h-4 w-4" />
      </IconButton>
    </form>
  );
}

export function FormViewsList({
  projectId,
  views,
  fieldCounts,
  manualFieldCount,
}: {
  projectId: string;
  views: FormView[];
  fieldCounts: Record<string, number>;
  manualFieldCount: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Link href={`/form-views/${projectId}/new`}>
          <Button disabled={manualFieldCount === 0}>+ New Form View</Button>
        </Link>
      </div>

      {manualFieldCount === 0 ? (
        <p className="text-sm text-charcoal/50">
          Add some manual fields in the Form Builder first — a Form View is built from them.
        </p>
      ) : null}

      {views.length === 0 ? (
        <EmptyState
          title="No Form Views yet"
          description="Create one to get a mobile-friendly way to fill in a handful of fields at a time."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Fields</Th>
              <Th className="w-1">&nbsp;</Th>
            </tr>
          </thead>
          <tbody>
            {views.map((v, i) => {
              const count = fieldCounts[v.id] ?? 0;
              return (
                <tr key={v.id} className={tableRowClass(i)}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/form-views/${projectId}/${v.id}`}
                      className="font-bold text-charcoal underline decoration-yellow decoration-2 underline-offset-2 hover:text-charcoal/70"
                    >
                      {v.name}
                    </Link>
                    {v.description ? (
                      <p className="mt-0.5 text-xs text-charcoal/50">{v.description}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge>
                      {count} field{count === 1 ? "" : "s"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/form-views/${projectId}/${v.id}/fill`}>
                        <Button variant="secondary" className="px-3 py-1.5 text-xs">
                          <Smartphone className="h-3.5 w-3.5" /> Fill
                        </Button>
                      </Link>
                      <DeleteFormViewButton projectId={projectId} formViewId={v.id} name={v.name} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
