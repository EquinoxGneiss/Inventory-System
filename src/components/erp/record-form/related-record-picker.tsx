"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface PickerOption {
  value: string;
  label: string;
  /** Secondary text, also searchable (e.g. SKU). */
  description?: string;
  /** Right-aligned hint (e.g. available quantity). */
  hint?: string;
  disabled?: boolean;
}

export interface RelatedRecordPickerProps {
  id: string;
  value: string;
  options: PickerOption[];
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-label"?: string;
  className?: string;
}

const MAX_RESULTS = 60;

/** Searchable record selector (spec §9 RelatedRecordPicker): Popover + Command. */
export function RelatedRecordPicker({
  id,
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText = "No matches.",
  className,
  ...aria
}: RelatedRecordPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((option) => option.value === value);

  const results = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const matches = needle
      ? options.filter((option) =>
          `${option.label} ${option.description ?? ""}`.toLowerCase().includes(needle),
        )
      : options;
    return matches.slice(0, MAX_RESULTS);
  }, [options, search]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={aria["aria-invalid"]}
          aria-describedby={aria["aria-describedby"]}
          aria-label={aria["aria-label"]}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-erp-text-muted",
            className,
          )}
        >
          <span className="truncate">
            {selected ? (
              <>
                {selected.description ? (
                  <span className="mr-1.5 font-mono text-xs text-erp-text-muted">
                    {selected.description}
                  </span>
                ) : null}
                {selected.label}
              </>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown aria-hidden className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-80 p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {results.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    aria-hidden
                    className={cn("size-4", option.value === value ? "opacity-100" : "opacity-0")}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{option.label}</span>
                    {option.description ? (
                      <span className="font-mono text-xs text-erp-text-muted">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  {option.hint ? (
                    <span className="shrink-0 text-xs text-erp-text-muted tabular-nums">
                      {option.hint}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
            {options.length > MAX_RESULTS && results.length === MAX_RESULTS ? (
              <p className="px-3 py-2 text-xs text-erp-text-muted">
                Showing the first {MAX_RESULTS}; type to narrow.
              </p>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
