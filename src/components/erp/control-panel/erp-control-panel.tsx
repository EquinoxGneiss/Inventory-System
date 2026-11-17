"use client";

import { Filter, Layers, Search, Star, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { useListState } from "@/components/erp/data-table/list-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface FilterOption {
  key: string;
  label: string;
  /** Options in the same group are combined with OR; groups combine with AND. */
  group?: string;
}

export interface FacetOption {
  /** Query-string parameter, e.g. "category". */
  param: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}

export interface GroupOption {
  key: string;
  label: string;
}

export interface SavedView {
  key: string;
  label: string;
  /** Query string applied by the view (without the leading "?"). */
  params: string;
}

export interface ERPControlPanelProps {
  searchLabel: string;
  searchPlaceholder: string;
  filters: FilterOption[];
  facets?: FacetOption[];
  groups: GroupOption[];
  savedViews: SavedView[];
  /** Left-side primary actions (New, …). */
  actions?: ReactNode;
  /** Right-side extras (column selector…). */
  trailing?: ReactNode;
}

const SEARCH_DEBOUNCE_MS = 350;

/**
 * ERPControlPanel (spec §4.1): keyword search, filter chips, Filters / Group By
 * / Favorites menus. All state lives in the URL via ListStateProvider.
 */
export function ERPControlPanel({
  searchLabel,
  searchPlaceholder,
  filters,
  facets = [],
  groups,
  savedViews,
  actions,
  trailing,
}: ERPControlPanelProps) {
  const { searchParams, update, replace } = useListState();
  const q = searchParams.get("q") ?? "";
  const activeFilters = (searchParams.get("filter") ?? "").split(",").filter(Boolean);
  const activeGroup = searchParams.get("group");

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | undefined>(undefined);

  // Reflect external changes (chips cleared, saved view, back button) in the
  // uncontrolled search box without clobbering what the user is typing.
  useEffect(() => {
    const input = inputRef.current;
    if (input && document.activeElement !== input && input.value !== q) input.value = q;
  }, [q]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  function scheduleSearch(value: string) {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(
      () => update({ q: value.trim() || null }),
      SEARCH_DEBOUNCE_MS,
    );
  }

  function toggleFilter(key: string, checked: boolean) {
    const next = checked ? [...activeFilters, key] : activeFilters.filter((item) => item !== key);
    update({ filter: next.length ? Array.from(new Set(next)).join(",") : null });
  }

  const filterGroups = Array.from(new Set(filters.map((filter) => filter.group ?? "")));
  const chips: Array<{ id: string; label: string; onRemove: () => void }> = [
    ...activeFilters.flatMap((key) => {
      const filter = filters.find((item) => item.key === key);
      return filter
        ? [{ id: `filter-${key}`, label: filter.label, onRemove: () => toggleFilter(key, false) }]
        : [];
    }),
    ...facets.flatMap((facet) => {
      const value = searchParams.get(facet.param);
      const option = facet.options.find((item) => item.value === value);
      return option
        ? [
            {
              id: `facet-${facet.param}`,
              label: `${facet.label}: ${option.label}`,
              onRemove: () => update({ [facet.param]: null }),
            },
          ]
        : [];
    }),
    ...(activeGroup
      ? (() => {
          const group = groups.find((item) => item.key === activeGroup);
          return group
            ? [
                {
                  id: "group",
                  label: `Grouped by ${group.label}`,
                  onRemove: () => update({ group: null }),
                },
              ]
            : [];
        })()
      : []),
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        <div className="ml-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <form
            role="search"
            className="relative w-full sm:w-80 lg:w-96"
            onSubmit={(event) => {
              event.preventDefault();
              window.clearTimeout(timerRef.current);
              update({ q: inputRef.current?.value.trim() || null });
            }}
          >
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-erp-text-muted"
            />
            <input
              ref={inputRef}
              type="search"
              name="q"
              defaultValue={q}
              aria-label={searchLabel}
              placeholder={searchPlaceholder}
              onChange={(event) => scheduleSearch(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-card pr-3 pl-8 text-sm outline-none placeholder:text-erp-text-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 max-md:h-11"
            />
          </form>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1.5">
                <Filter aria-hidden />
                Filters
                {activeFilters.length ? (
                  <span className="rounded-full bg-erp-brand px-1.5 text-[11px] text-white">
                    {activeFilters.length}
                  </span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {filterGroups.map((group, index) => (
                <DropdownMenuGroup key={group || "default"}>
                  {index > 0 ? <DropdownMenuSeparator /> : null}
                  {filters
                    .filter((filter) => (filter.group ?? "") === group)
                    .map((filter) => (
                      <DropdownMenuCheckboxItem
                        key={filter.key}
                        checked={activeFilters.includes(filter.key)}
                        onCheckedChange={(checked) => toggleFilter(filter.key, checked === true)}
                        onSelect={(event) => event.preventDefault()}
                      >
                        {filter.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuGroup>
              ))}
              {facets.map((facet) => (
                <DropdownMenuGroup key={facet.param}>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>{facet.label}</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="max-h-80 w-64 overflow-y-auto">
                      <DropdownMenuRadioGroup
                        value={searchParams.get(facet.param) ?? ""}
                        onValueChange={(value) => update({ [facet.param]: value || null })}
                      >
                        <DropdownMenuRadioItem value="">All</DropdownMenuRadioItem>
                        {facet.options.map((option) => (
                          <DropdownMenuRadioItem key={option.value} value={option.value}>
                            {option.label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuGroup>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1.5">
                <Layers aria-hidden />
                Group By
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuRadioGroup
                value={activeGroup ?? ""}
                onValueChange={(value) => update({ group: value || null })}
              >
                <DropdownMenuRadioItem value="">No grouping</DropdownMenuRadioItem>
                {groups.map((group) => (
                  <DropdownMenuRadioItem key={group.key} value={group.key}>
                    {group.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1.5">
                <Star aria-hidden />
                Favorites
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="text-xs font-normal text-erp-text-muted">
                Saved views
              </DropdownMenuLabel>
              {savedViews.map((view) => (
                <DropdownMenuItem key={view.key} onSelect={() => replace(view.params)}>
                  {view.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <p className="px-2 py-1.5 text-xs text-erp-text-muted">
                Saving personal and shared views arrives in Phase 6.
              </p>
            </DropdownMenuContent>
          </DropdownMenu>

          {trailing}
        </div>
      </div>

      {chips.length > 0 ? (
        <ul aria-label="Active filters" className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <li key={chip.id}>
              <span className="inline-flex h-7 items-center gap-1 rounded-full border border-erp-brand/25 bg-erp-brand-tint pr-1 pl-2.5 text-xs font-medium text-erp-brand">
                {chip.label}
                <button
                  type="button"
                  onClick={chip.onRemove}
                  aria-label={`Remove ${chip.label}`}
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full hover:bg-erp-brand/10",
                    "focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
                  )}
                >
                  <X aria-hidden className="size-3" />
                </button>
              </span>
            </li>
          ))}
          <li>
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                if (inputRef.current) inputRef.current.value = "";
                replace("");
              }}
            >
              Clear all
            </Button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
