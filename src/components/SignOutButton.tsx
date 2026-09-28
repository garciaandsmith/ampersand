"use client";

import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        title="Sign out"
        className={
          className ??
          "flex items-center gap-1.5 text-xs font-semibold text-charcoal/60 transition hover:text-charcoal"
        }
      >
        <LogOut className="h-3.5 w-3.5" /> Sign out
      </button>
    </form>
  );
}
