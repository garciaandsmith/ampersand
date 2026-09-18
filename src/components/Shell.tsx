import type { ReactNode } from "react";

export function Shell({
  roleLabel,
  eyebrow,
  title,
  headerActions,
  children,
}: {
  roleLabel: string;
  eyebrow?: string;
  title: string;
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-charcoal/10 bg-paper px-8 py-4">
        <div>
          {eyebrow ? (
            <div className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="font-sans text-xl font-extrabold text-charcoal">{title}</h1>
        </div>
        <div className="flex items-center gap-4">
          {headerActions}
          <span className="rounded bg-yellow px-3 py-1 text-xs font-bold uppercase tracking-wide text-charcoal">
            {roleLabel}
          </span>
        </div>
      </header>

      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
