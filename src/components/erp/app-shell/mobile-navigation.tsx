"use client";

import { Check, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { VisibleNavModule } from "@/features/navigation/nav-config";
import type { OrganizationSummary } from "@/lib/authorization/types";
import { cn } from "@/lib/utils";
import { headerButtonClass } from "./header-button";
import { PlannedTag } from "./module-navigation-bar";
import { useOrganizationSwitch } from "./organization-switcher";

export interface MobileNavigationProps {
  modules: VisibleNavModule[];
  active: OrganizationSummary;
  organizations: OrganizationSummary[];
}

/** Drawer navigation for screens below 768px (spec §3.3). */
export function MobileNavigation({ modules, active, organizations }: MobileNavigationProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { select, isPending } = useOrganizationSwitch();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(headerButtonClass, "md:hidden")}
          aria-label="Open navigation menu"
        >
          <Menu aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 gap-0 overflow-y-auto p-0">
        <SheetHeader className="border-b bg-erp-brand text-white">
          <SheetTitle className="text-white">InventoryOS</SheetTitle>
          <SheetDescription className="text-white/80">{active.name}</SheetDescription>
        </SheetHeader>

        {organizations.length > 1 ? (
          <section aria-labelledby="mobile-org-heading" className="border-b px-4 py-3">
            <h2
              id="mobile-org-heading"
              className="mb-1 text-xs font-medium text-erp-text-muted uppercase"
            >
              Organization
            </h2>
            <ul className="space-y-1">
              {organizations.map((organization) => (
                <li key={organization.id}>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setOpen(false);
                      if (organization.id !== active.id) select(organization.id);
                    }}
                    className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-accent"
                    aria-current={organization.id === active.id ? "true" : undefined}
                  >
                    <span className="flex-1">{organization.name}</span>
                    {organization.id === active.id ? (
                      <Check aria-hidden className="size-4" />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <nav aria-label="Inventory modules" className="px-2 py-3">
          {modules.map((module) => (
            <div key={module.key} className="mb-2">
              {module.href && module.items.length === 0 ? (
                <Link
                  href={module.href}
                  onClick={() => setOpen(false)}
                  aria-current={pathname.startsWith(module.match) ? "page" : undefined}
                  className="flex min-h-11 items-center rounded-md px-2 text-sm font-semibold hover:bg-accent aria-[current=page]:text-erp-brand"
                >
                  {module.label}
                </Link>
              ) : (
                <>
                  <p className="px-2 pt-2 pb-1 text-xs font-medium tracking-wide text-erp-text-muted uppercase">
                    {module.label}
                  </p>
                  <ul>
                    {module.items.map((item) => (
                      <li key={item.label}>
                        {item.href ? (
                          <Link
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className="flex min-h-11 items-center rounded-md px-2 text-sm hover:bg-accent"
                          >
                            {item.label}
                          </Link>
                        ) : (
                          <span
                            aria-disabled="true"
                            className="flex min-h-11 items-center gap-2 px-2 text-sm text-erp-text-muted"
                          >
                            {item.label}
                            <PlannedTag phase={item.phase} />
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
