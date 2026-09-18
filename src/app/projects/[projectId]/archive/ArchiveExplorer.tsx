"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Search, Settings2 } from "lucide-react";
import type { ArchiveItem, ArchiveItemValue, FormField } from "@/lib/types";
import { Badge, Button, EmptyState, Input, MultiSelect, Table, Th } from "@/components/ui";
import { tableRowClass } from "@/lib/table";

const DEFAULT_VISIBLE_COLUMNS = 5;
const FILTERABLE_TYPES = new Set(["single_select", "multi_select", "tags"]);

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

export function ArchiveExplorer({
  projectId,
  fields,
  items,
  valuesByItem,
}: {
  projectId: string;
  fields: FormField[];
  items: ArchiveItem[];
  valuesByItem: Record<string, ArchiveItemValue[]>;
}) {
  const columns = useMemo(() => fields.filter((f) => f.data_type !== "file"), [fields]);
  const filterableFields = useMemo(
    () => columns.filter((f) => FILTERABLE_TYPES.has(f.data_type)),
    [columns],
  );

  const [search, setSearch] = useState("");
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>(() =>
    columns.slice(0, DEFAULT_VISIBLE_COLUMNS).map((c) => c.id),
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>({});

  const filterOptions = useMemo(() => {
    const options: Record<string, { value: string; label: string }[]> = {};
    for (const field of filterableFields) {
      if (field.options?.length) {
        options[field.id] = field.options.map((o) => ({ value: o, label: o }));
        continue;
      }
      const seen = new Set<string>();
      for (const item of items) {
        const value = valuesByItem[item.id]?.find((v) => v.field_id === field.id);
        if (field.data_type === "tags" || field.data_type === "multi_select") {
          for (const t of (value?.value_jsonb as string[] | undefined) ?? []) seen.add(t);
        } else if (value?.value_text) {
          seen.add(value.value_text);
        }
      }
      options[field.id] = Array.from(seen).map((v) => ({ value: v, label: v }));
    }
    return options;
  }, [filterableFields, items, valuesByItem]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items
      .map((item) => {
        const values = Object.fromEntries(
          (valuesByItem[item.id] ?? []).map((v) => [v.field_id, v]),
        );
        return { item, values };
      })
      .filter(({ item, values }) => {
        for (const field of filterableFields) {
          const selected = filterValues[field.id];
          if (!selected?.length) continue;
          const v = values[field.id];
          if (field.data_type === "tags" || field.data_type === "multi_select") {
            const tags = (v?.value_jsonb as string[] | undefined) ?? [];
            if (!tags.some((t) => selected.includes(t))) return false;
          } else if (!v?.value_text || !selected.includes(v.value_text)) {
            return false;
          }
        }
        if (!query) return true;
        const haystack = [item.title ?? "", ...Object.values(values).map((v) => v.value_text ?? "")]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
  }, [items, valuesByItem, search, filterValues, filterableFields]);

  const visibleColumns = columns.filter((c) => visibleColumnIds.includes(c.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/projects/${projectId}/form-builder`}
          className="flex items-center gap-1.5 font-sans text-sm font-extrabold text-charcoal underline decoration-yellow decoration-2 underline-offset-4 hover:text-charcoal/70"
        >
          <Settings2 className="h-4 w-4" />
          This project&rsquo;s structure lives in the Form Builder →
        </Link>
        <Link href={`/projects/${projectId}/archive/new`}>
          <Button>+ New</Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search archive…"
            className="pl-9"
          />
        </div>
        <Button
          variant={filtersOpen ? "secondary" : "ghost"}
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <Filter className="h-4 w-4" /> Filters
          {Object.values(filterValues).some((v) => v.length) ? (
            <Badge color="yellow">{Object.values(filterValues).flat().length}</Badge>
          ) : null}
        </Button>
        <MultiSelect
          label="Columns"
          options={columns.map((c) => ({ value: c.id, label: c.name }))}
          value={visibleColumnIds}
          onChange={setVisibleColumnIds}
        />
      </div>

      {filtersOpen ? (
        <div className="flex flex-wrap items-center gap-2 rounded border border-charcoal/15 bg-charcoal/[0.03] p-3">
          {filterableFields.length === 0 ? (
            <p className="text-xs text-charcoal/50">
              No closed-list, multi-select, or tag fields to filter by yet.
            </p>
          ) : (
            filterableFields.map((field) => (
              <MultiSelect
                key={field.id}
                label={field.name}
                options={filterOptions[field.id] ?? []}
                value={filterValues[field.id] ?? []}
                onChange={(v) => setFilterValues((prev) => ({ ...prev, [field.id]: v }))}
              />
            ))
          )}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title={items.length === 0 ? "Archive is empty" : "No matches"}
          description={
            items.length === 0
              ? "Ingest your first document, image, or asset to start building this project's knowledge base."
              : "Try a different search term or filter."
          }
          action={
            items.length === 0 ? (
              <Link href={`/projects/${projectId}/archive/new`}>
                <Button>+ New record</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Title</Th>
              {visibleColumns.map((c) => (
                <Th key={c.id}>{c.name}</Th>
              ))}
              <Th>Created</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ item, values }, i) => (
              <tr key={item.id} className={tableRowClass(i)}>
                <td className="px-4 py-3">
                  <Link
                    href={`/projects/${projectId}/archive/${item.id}`}
                    className="font-bold text-charcoal underline decoration-yellow decoration-2 underline-offset-2 hover:text-charcoal/70"
                  >
                    {item.title ?? "Untitled"}
                  </Link>
                </td>
                {visibleColumns.map((c) => {
                  const v = values[c.id];
                  const text = v?.value_text ?? "";
                  return (
                    <td key={c.id} className="px-4 py-3 text-charcoal/70">
                      {c.data_type === "tags" || c.data_type === "multi_select" ? (
                        v?.value_jsonb ? (
                          <div className="flex flex-wrap gap-1">
                            {(v.value_jsonb as string[]).map((t) => (
                              <Badge key={t}>{t}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-charcoal/30">—</span>
                        )
                      ) : text ? (
                        truncate(text, 60)
                      ) : (
                        <span className="text-charcoal/30">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-charcoal/50">
                  {new Date(item.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
