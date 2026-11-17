"use client";

import { Columns3 } from "lucide-react";

import { useListPreferences } from "@/components/erp/data-table/list-preferences";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface SelectableColumn {
  id: string;
  label: string;
  defaultHidden?: boolean;
}

/** Column visibility and row density (spec §8.4, §10.2), stored per viewer. */
export function ColumnSelector({
  listKey,
  columns,
}: {
  listKey: string;
  columns: SelectableColumn[];
}) {
  const { preferences, save } = useListPreferences(listKey);
  const hidden =
    preferences.hiddenColumns ??
    columns.filter((column) => column.defaultHidden).map((column) => column.id);

  function toggle(id: string, visible: boolean) {
    const next = visible ? hidden.filter((item) => item !== id) : [...hidden, id];
    save({ hiddenColumns: next });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Columns and density">
          <Columns3 aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-erp-text-muted">
          Columns
        </DropdownMenuLabel>
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={!hidden.includes(column.id)}
            onCheckedChange={(checked) => toggle(column.id, checked === true)}
            onSelect={(event) => event.preventDefault()}
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuItem onSelect={() => save({ hiddenColumns: null })}>
          Reset columns
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-erp-text-muted">
          Row density
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={preferences.density}
          onValueChange={(value) => save({ density: value === "normal" ? "normal" : "compact" })}
        >
          <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="normal">Comfortable</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
