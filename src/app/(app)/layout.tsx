import { requireUser } from "@/lib/auth/session";
import { listProjectsForUser } from "@/lib/data/projects";
import { Sidebar } from "@/components/Sidebar";

// Everything reachable from the sidebar (admin + project shells) lives under
// this group. requireUser() redirects signed-out visitors to /login before
// any of it renders.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const projects = await listProjectsForUser(user.id, user.profile.is_admin);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        projects={projects}
        isAdmin={user.profile.is_admin}
        userEmail={user.email}
        displayName={user.profile.display_name}
      />
      {children}
    </div>
  );
}
