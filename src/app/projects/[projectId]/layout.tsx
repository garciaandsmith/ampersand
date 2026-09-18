import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { getProject } from "@/lib/data/projects";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) notFound();

  return (
    <Shell
      roleLabel="user"
      eyebrow="PROJECT"
      title={project.name}
      headerActions={
        <Link
          href="/admin/projects"
          className="text-xs font-semibold text-charcoal/60 underline hover:text-charcoal"
        >
          ← All projects
        </Link>
      }
    >
      {children}
    </Shell>
  );
}
