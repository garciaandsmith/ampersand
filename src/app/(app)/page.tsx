import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { listProjectsForUser } from "@/lib/data/projects";
import { EmptyState } from "@/components/ui";

export default async function Home() {
  const user = await requireUser();

  if (user.profile.is_admin) redirect("/admin/projects");

  const projects = await listProjectsForUser(user.id, false);
  if (projects.length > 0) redirect(`/projects/${projects[0].id}/archive`);

  return (
    <div className="flex flex-1 items-center justify-center px-8 py-8">
      <EmptyState
        title="No projects yet"
        description="You haven't been assigned to a project. Ask an admin to add you to one."
      />
    </div>
  );
}
