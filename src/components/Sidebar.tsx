"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive as ArchiveIcon,
  Folder,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings2,
  Sparkles,
} from "lucide-react";
import type { Project } from "@/lib/types";
import { NewProjectModal } from "@/components/NewProjectModal";

const COLLAPSE_STORAGE_KEY = "ampersand-sidebar-collapsed";

function subLinkClass(active: boolean) {
  return `flex items-center gap-2 rounded px-2 py-1.5 text-xs font-semibold transition ${
    active ? "text-yellow" : "text-paper/60 hover:text-paper"
  }`;
}

export function Sidebar({ projects }: { projects: Project[] }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // Read after mount (not in the initial state) so server and client agree on
    // the first render; localStorage isn't available during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(COLLAPSE_STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const isAdmin = pathname.startsWith("/admin");

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col overflow-x-hidden bg-charcoal text-paper transition-[width] duration-150 ${
        collapsed ? "w-[72px]" : "w-64"
      }`}
    >
      <div className={`flex items-center gap-2 px-4 py-5 ${collapsed ? "flex-col" : "justify-between"}`}>
        <Link href="/" className="flex items-center gap-2 overflow-hidden">
          <Image src="/brand/icon-yellow.png" alt="" width={26} height={26} className="shrink-0" />
          {!collapsed ? (
            <span className="font-sans text-lg font-extrabold tracking-wide">AMPERSAND</span>
          ) : null}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="grid h-7 w-7 shrink-0 place-items-center rounded text-paper/50 transition hover:bg-white/10 hover:text-paper"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        <NewProjectModal
          trigger={(open) => (
            <button
              type="button"
              onClick={open}
              title="New project"
              className={`flex items-center gap-2 rounded border border-dashed border-white/25 px-3 py-2 text-sm font-semibold text-paper/70 transition hover:border-yellow hover:text-paper ${
                collapsed ? "justify-center" : ""
              }`}
            >
              <Plus className="h-4 w-4 shrink-0" />
              {!collapsed ? "New project" : null}
            </button>
          )}
        />

        {!collapsed ? (
          <div className="mb-1 mt-6 px-1 text-[11px] font-bold uppercase tracking-wide text-paper/40">
            Projects
          </div>
        ) : (
          <div className="mt-6" />
        )}

        <nav className="flex flex-col gap-0.5">
          {projects.map((project) => {
            const isActive = pathname.startsWith(`/projects/${project.id}`);
            return (
              <div key={project.id}>
                <Link
                  href={`/projects/${project.id}/archive`}
                  title={project.name}
                  className={`flex items-center gap-2 rounded px-2 py-2 text-sm font-semibold transition ${
                    isActive ? "bg-white/10 text-paper" : "text-paper/70 hover:bg-white/5 hover:text-paper"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  {isActive ? (
                    <FolderOpen className="h-4 w-4 shrink-0 text-yellow" />
                  ) : (
                    <Folder className="h-4 w-4 shrink-0 text-yellow" />
                  )}
                  {!collapsed ? <span className="truncate">{project.name}</span> : null}
                </Link>
                {isActive && !collapsed ? (
                  <div className="ml-6 mt-0.5 flex flex-col gap-0.5 border-l border-white/10 pl-3">
                    <Link
                      href={`/projects/${project.id}/archive`}
                      className={subLinkClass(pathname.startsWith(`/projects/${project.id}/archive`))}
                    >
                      <ArchiveIcon className="h-3.5 w-3.5" /> Archive
                    </Link>
                    <Link
                      href={`/projects/${project.id}/create`}
                      className={subLinkClass(pathname.startsWith(`/projects/${project.id}/create`))}
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Create
                    </Link>
                  </div>
                ) : null}
              </div>
            );
          })}
          {projects.length === 0 && !collapsed ? (
            <p className="px-2 py-2 text-xs text-paper/40">No projects yet</p>
          ) : null}
        </nav>
      </div>

      <div className={`flex items-center gap-2 border-t border-white/10 px-3 py-4 ${collapsed ? "flex-col" : ""}`}>
        <Link
          href="/admin/projects"
          aria-label="Administration"
          title="Administration"
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border transition ${
            isAdmin
              ? "border-yellow bg-yellow/10 text-yellow"
              : "border-white/20 text-paper/60 hover:border-yellow hover:text-yellow"
          }`}
        >
          <Settings2 className="h-4 w-4" />
        </Link>
        {!collapsed ? <span className="text-[11px] text-paper/40">García&amp;Smith · AMPERSAND</span> : null}
      </div>
    </aside>
  );
}
