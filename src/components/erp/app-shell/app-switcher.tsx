"use client";

import { Boxes, LayoutGrid } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { headerButtonClass } from "./header-button";

/** Application launcher (spec §2.1). Inventory is the only app in v1. */
export function AppSwitcher() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={headerButtonClass} aria-label="Applications">
          <LayoutGrid aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <p className="mb-2 text-xs font-medium tracking-wide text-erp-text-muted uppercase">
          Applications
        </p>
        <Link
          href="/inventory/overview"
          className="flex items-center gap-3 rounded-md border p-3 hover:bg-accent"
        >
          <span className="flex size-9 items-center justify-center rounded-md bg-erp-brand text-white">
            <Boxes aria-hidden className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Inventory</span>
            <span className="block text-xs text-erp-text-muted">
              Products, requests and stock operations
            </span>
          </span>
        </Link>
        <p className="mt-3 text-xs text-erp-text-muted">
          Other ERP apps can be added here as future modules.
        </p>
      </PopoverContent>
    </Popover>
  );
}
