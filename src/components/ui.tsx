"use client";

import { useEffect } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const styles: Record<string, string> = {
    primary: "bg-yellow text-charcoal hover:brightness-95",
    secondary: "bg-charcoal text-paper hover:brightness-110",
    danger: "bg-coral text-white hover:brightness-95",
    ghost: "bg-transparent text-charcoal border border-charcoal/20 hover:bg-charcoal/5",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export function IconButton({
  variant = "ghost",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const styles: Record<string, string> = {
    primary: "bg-yellow text-charcoal hover:brightness-95",
    secondary: "bg-charcoal text-paper hover:brightness-110",
    danger: "bg-coral text-white hover:brightness-95",
    ghost: "bg-transparent text-charcoal/60 border border-charcoal/20 hover:border-charcoal hover:text-charcoal",
  };
  return (
    <button
      className={`inline-flex shrink-0 items-center justify-center rounded p-2 transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded border border-charcoal/30 bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-charcoal ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded border border-charcoal/30 bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-charcoal ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded border border-charcoal/30 bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-charcoal ${props.className ?? ""}`}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-charcoal/60">
      {children}
    </label>
  );
}

export function Field({ children }: { children: ReactNode }) {
  return <div className="mb-4">{children}</div>;
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded border border-charcoal/15 bg-white p-6 ${className}`}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  color = "charcoal",
}: {
  children: ReactNode;
  color?: "charcoal" | "teal" | "yellow" | "coral" | "purple";
}) {
  const styles: Record<string, string> = {
    charcoal: "bg-charcoal/10 text-charcoal",
    teal: "bg-teal/20 text-charcoal",
    yellow: "bg-yellow/30 text-charcoal",
    coral: "bg-coral/15 text-coral",
    purple: "bg-purple/15 text-purple",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${styles[color]}`}
    >
      {children}
    </span>
  );
}

export function Table({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`overflow-x-auto rounded border border-charcoal/15 bg-white ${className}`}>
      <table className="w-full border-collapse text-left text-sm" style={style}>
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`h-11 whitespace-nowrap border-b border-charcoal/15 bg-charcoal/[0.05] px-4 text-[11px] font-bold uppercase tracking-wide text-charcoal/55 ${className}`}
    >
      {children}
    </th>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded border border-dashed border-charcoal/25 py-16 text-center">
      <p className="font-sans text-lg font-bold text-charcoal">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-charcoal/60">{description}</p>
      ) : null}
      {action}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded border border-charcoal/15 bg-paper p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title ? <h3 className="mb-4 font-sans text-base font-extrabold">{title}</h3> : null}
        {children}
      </div>
    </div>
  );
}

export function MultiSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const caption = value.length ? `${label} · ${value.length}` : label;
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded border border-charcoal/20 bg-white px-3 py-2 text-sm font-semibold text-charcoal [&::-webkit-details-marker]:hidden">
        {caption}
        <ChevronDown className="h-3.5 w-3.5 text-charcoal/50 transition group-open:rotate-180" />
      </summary>
      <div className="absolute left-0 z-20 mt-1 max-h-64 min-w-[200px] overflow-y-auto rounded border border-charcoal/15 bg-white p-2 shadow-lg">
        <button
          type="button"
          onClick={() => onChange([])}
          className="mb-1 block w-full rounded px-2 py-1 text-left text-xs font-semibold text-charcoal/50 hover:bg-charcoal/5"
        >
          Clear
        </button>
        {options.length === 0 ? (
          <p className="px-2 py-1 text-xs text-charcoal/40">No options</p>
        ) : (
          options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-charcoal/5"
            >
              <input
                type="checkbox"
                checked={value.includes(option.value)}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...value, option.value]
                      : value.filter((v) => v !== option.value),
                  )
                }
              />
              <span className="truncate">{option.label}</span>
            </label>
          ))
        )}
      </div>
    </details>
  );
}
