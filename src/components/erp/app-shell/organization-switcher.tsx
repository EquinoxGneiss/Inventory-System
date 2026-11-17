"use client";

import { Building2, ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OrganizationSummary } from "@/lib/authorization/types";
import { switchOrganization } from "@/lib/demo/actions";
import { cn } from "@/lib/utils";
import { headerButtonClass } from "./header-button";

const RECORD_PATH = /^\/inventory\/(products|requests)\/(?!new$)[^/]+$/;

export function useOrganizationSwitch() {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function select(organizationId: string) {
    startTransition(async () => {
      const result = await switchOrganization(organizationId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      // A record from the previous organization isn't visible in the new one.
      const match = RECORD_PATH.exec(pathname);
      if (match) router.push(`/inventory/${match[1]}`);
      else router.refresh();
    });
  }
  return { select, isPending };
}

export interface OrganizationSwitcherProps {
  active: OrganizationSummary;
  organizations: OrganizationSummary[];
  className?: string;
}

/** Active organization selector (spec §2.1: always visible, explicit switching). */
export function OrganizationSwitcher({
  active,
  organizations,
  className,
}: OrganizationSwitcherProps) {
  const { select, isPending } = useOrganizationSwitch();

  if (organizations.length <= 1) {
    return (
      <span className={cn("flex items-center gap-2 px-2 text-sm text-white/95", className)}>
        <Building2 aria-hidden className="size-4 opacity-80" />
        <span className="sr-only">Organization: </span>
        <span className="max-w-56 truncate font-medium">{active.name}</span>
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(headerButtonClass, "max-w-72 gap-2 font-medium", className)}
          disabled={isPending}
        >
          <Building2 aria-hidden className="opacity-80" />
          <span className="sr-only">Organization: </span>
          <span className="truncate">{active.name}</span>
          <ChevronDown aria-hidden className="opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Switch organization</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={active.id} onValueChange={select}>
          {organizations.map((organization) => (
            <DropdownMenuRadioItem key={organization.id} value={organization.id}>
              <span className="flex flex-col">
                <span>{organization.name}</span>
                <span className="text-xs text-erp-text-muted">{organization.code}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
