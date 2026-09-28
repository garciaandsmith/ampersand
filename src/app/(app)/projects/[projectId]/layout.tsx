import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { SignOutButton } from "@/components/SignOutButton";
import { requireProjectAccessPage } from "@/lib/auth/session";
import { getProject } from "@/lib/data/projects";

const ROLE_LABELS = { admin: "Admin", editor: "Editor", user: "User" } as const;

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

  // Redirects to "/" if this user has no access to this project at all.
  const { role } = await requireProjectAccessPage(projectId);

  return (
    <Shell
      roleLabel={ROLE_LABELS[role]}
      eyebrow="PROJECT"
      title={project.name}
      headerActions={
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs font-semibold text-charcoal/60 underline hover:text-charcoal">
            ← Home
          </Link>
          <SignOutButton />
        </div>
      }
    >
      {children}
    </Shell>
  );
}
