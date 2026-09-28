import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/session";
import { getProject } from "@/lib/data/projects";
import { listProjectMembers, listUsers } from "@/lib/data/users";
import { Button, EmptyState, Select, Table, Th } from "@/components/ui";
import { tableRowClass } from "@/lib/table";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { PROJECT_ROLE_LABELS } from "@/lib/types";
import {
  addProjectMemberAction,
  removeProjectMemberAction,
  updateProjectMemberRoleAction,
} from "./actions";

export default async function ProjectAccessPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await requireAdminPage();
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) notFound();

  const [members, allUsers] = await Promise.all([listProjectMembers(projectId), listUsers()]);
  const memberIds = new Set(members.map((m) => m.user_id));
  // Admins already have full access everywhere, so they're not offered here.
  const availableUsers = allUsers.filter((u) => !u.is_admin && !memberIds.has(u.id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/projects"
          className="text-xs font-semibold text-charcoal/60 underline hover:text-charcoal"
        >
          ← All projects
        </Link>
        <h2 className="mt-1 font-sans text-base font-extrabold">Access — {project.name}</h2>
      </div>

      {members.length === 0 ? (
        <EmptyState
          title="No one assigned yet"
          description="Admins already have full access to every project. Add editors or read-only users below."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Person</Th>
              <Th>Role</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={m.user_id} className={tableRowClass(i)}>
                <td className="px-4 py-3 font-semibold text-charcoal">{m.display_name || m.email}</td>
                <td className="px-4 py-3">
                  <form action={updateProjectMemberRoleAction} className="flex items-center gap-2">
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="userId" value={m.user_id} />
                    <Select name="role" defaultValue={m.role} className="w-64">
                      <option value="user">{PROJECT_ROLE_LABELS.user}</option>
                      <option value="editor">{PROJECT_ROLE_LABELS.editor}</option>
                    </Select>
                    <Button type="submit" variant="ghost" className="px-3 py-1.5 text-xs">
                      Save
                    </Button>
                  </form>
                </td>
                <td className="px-4 py-3 text-right">
                  <ConfirmDeleteButton
                    action={removeProjectMemberAction}
                    fields={{ projectId, userId: m.user_id }}
                    confirmMessage={`Remove ${m.email} from ${project.name}?`}
                    label="Remove"
                    className="px-3 py-1 text-xs"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {availableUsers.length > 0 ? (
        <div className="rounded border border-dashed border-charcoal/25 p-4">
          <h3 className="mb-3 text-sm font-bold text-charcoal">Add someone</h3>
          <form action={addProjectMemberAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="projectId" value={projectId} />
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-charcoal/60">
                User
              </label>
              <Select name="userId" className="w-64" required defaultValue="">
                <option value="" disabled>
                  Choose a user…
                </option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name || u.email}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-charcoal/60">
                Role
              </label>
              <Select name="role" className="w-64" defaultValue="user">
                <option value="user">{PROJECT_ROLE_LABELS.user}</option>
                <option value="editor">{PROJECT_ROLE_LABELS.editor}</option>
              </Select>
            </div>
            <Button type="submit">Add</Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
