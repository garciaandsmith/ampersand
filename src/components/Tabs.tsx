"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type TabItem = {
  label: string;
  href: string;
};

export function Tabs({ items }: { items: TabItem[] }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-charcoal/15">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`border-b-2 px-5 py-3 text-sm font-bold transition-colors ${
              active
                ? "border-yellow text-charcoal"
                : "border-transparent text-charcoal/50 hover:text-charcoal"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
