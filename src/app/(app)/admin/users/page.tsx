import { requireUser } from "@/lib/auth/session";
import { listUsers } from "@/lib/data/users";
import { Badge, EmptyState, Table, Th } from "@/components/ui";
import { tableRowClass } from "@/lib/table";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { InviteUserModal } from "./InviteUserModal";
import { deleteUserAction, setUserAdminAction } from "./actions";

export default async function UsersPage() {
  const [me, users] = await Promise.all([requireUser(), listUsers()]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-base font-extrabold">Users</h2>
        <InviteUserModal />
      </div>

      {users.length === 0 ? (
        <EmptyState
          title="No users yet"
          description="Invite the first person to give them access."
          action={<InviteUserModal />}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Joined</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr key={user.id} className={tableRowClass(i)}>
                <td className="px-4 py-3 font-semibold text-charcoal">
                  {user.email}
                  {user.id === me.id ? (
                    <span className="ml-2 text-xs font-normal text-charcoal/40">(you)</span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {user.is_admin ? <Badge color="yellow">Admin</Badge> : <Badge>Per-project</Badge>}
                </td>
                <td className="px-4 py-3 text-charcoal/70">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {user.id !== me.id ? (
                      <form action={setUserAdminAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="isAdmin" value={(!user.is_admin).toString()} />
                        <button
                          type="submit"
                          className="text-xs font-semibold text-charcoal/60 underline hover:text-charcoal"
                        >
                          {user.is_admin ? "Remove admin" : "Make admin"}
                        </button>
                      </form>
                    ) : null}
                    {user.id !== me.id ? (
                      <ConfirmDeleteButton
                        action={deleteUserAction}
                        fields={{ userId: user.id }}
                        confirmMessage={`Remove ${user.email}? They'll lose access to every project immediately.`}
                        className="px-3 py-1 text-xs"
                      />
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
