import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireProjectAccessPage } from "@/lib/auth/session";
import { getProject } from "@/lib/data/projects";

/**
 * Form Views deliberately live outside (app)'s sidebar and the project
 * Shell — a separate, full-width, mobile-first surface (Google Forms'
 * build/fill views are the same: no persistent app nav alongside them),
 * with just a way back to the regular backend instead of the platform's
 * usual chrome.
 */
export default async function FormViewsProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) notFound();
  // Every page under here re-checks the exact role it needs; this just keeps
  // signed-out or no-access visitors from seeing even this bare chrome.
  await requireProjectAccessPage(projectId, "editor");

  return (
    <div className="min-h-screen w-full bg-paper">
      <header className="flex items-center justify-between border-b border-charcoal/10 px-4 py-3 sm:px-8">
        <Link
          href={`/projects/${projectId}/archive`}
          className="flex items-center gap-1.5 text-sm font-bold text-charcoal/60 hover:text-charcoal"
        >
          <ArrowLeft className="h-4 w-4" />
          {project.name}
        </Link>
        <span className="text-xs font-bold uppercase tracking-wide text-charcoal/40">Form Views</span>
      </header>
      <main className="w-full px-4 py-6 sm:px-8">{children}</main>
    </div>
  );
}
