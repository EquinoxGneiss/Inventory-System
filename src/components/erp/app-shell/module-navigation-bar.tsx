"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { VisibleNavModule } from "@/features/navigation/nav-config";

const itemClass =
  "relative flex h-full shrink-0 items-center gap-1 px-3 text-sm text-erp-text-subtle outline-none transition-colors hover:text-erp-text focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset data-[active=true]:font-semibold data-[active=true]:text-erp-brand data-[active=true]:after:absolute data-[active=true]:after:inset-x-2 data-[active=true]:after:bottom-0 data-[active=true]:after:h-0.5 data-[active=true]:after:rounded-full data-[active=true]:after:bg-erp-brand";

export function PlannedTag({ phase }: { phase: number | null }) {
  return (
    <span className="ml-auto rounded-sm bg-erp-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-erp-text-subtle">
      Planned{phase ? ` · Phase ${phase}` : ""}
    </span>
  );
}

/** Level B module bar (spec §2.1): sticky, horizontal, Odoo-style dropdowns. */
export function ModuleNavigationBar({ modules }: { modules: VisibleNavModule[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Inventory modules"
      className="hidden h-erp-modulebar items-stretch overflow-x-auto border-b bg-card px-3 md:flex"
    >
      <span className="mr-2 flex shrink-0 items-center pr-2 text-sm font-semibold text-erp-text">
        Inventory
      </span>
      {modules.map((module) => {
        const active = pathname.startsWith(module.match);
        if (module.items.length === 0 && module.href) {
          return (
            <Link
              key={module.key}
              href={module.href}
              data-active={active}
              aria-current={active ? "page" : undefined}
              className={itemClass}
            >
              {module.label}
            </Link>
          );
        }
        return (
          <DropdownMenu key={module.key}>
            <DropdownMenuTrigger data-active={active} className={itemClass}>
              {module.label}
              <ChevronDown aria-hidden className="size-3.5 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {module.items.map((item) =>
                item.href ? (
                  <DropdownMenuItem key={item.label} asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem key={item.label} disabled>
                    <span>{item.label}</span>
                    <PlannedTag phase={item.phase} />
                  </DropdownMenuItem>
                ),
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </nav>
  );
}
