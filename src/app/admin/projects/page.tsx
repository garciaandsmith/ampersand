import Link from "next/link";
import { listProjects } from "@/lib/data/projects";
import { EmptyState, Table, Th } from "@/components/ui";
import { tableRowClass } from "@/lib/table";
import { NewProjectModal } from "@/components/NewProjectModal";

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-base font-extrabold">Project list</h2>
        <NewProjectModal />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start building its Archive."
          action={<NewProjectModal />}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>User/s</Th>
              <Th>Date created</Th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project, i) => (
              <tr key={project.id} className={tableRowClass(i)}>
                <td className="px-4 py-3">
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-bold text-charcoal underline decoration-yellow decoration-2 underline-offset-2 hover:text-charcoal/70"
                  >
                    {project.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-charcoal/70">{project.users || "—"}</td>
                <td className="px-4 py-3 text-charcoal/70">
                  {new Date(project.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
