"use client";

import { useRouter } from "next/navigation";
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SessionUser } from "@/lib/authorization/types";
import { switchPersona } from "@/lib/demo/actions";
import { cn } from "@/lib/utils";
import { headerButtonClass } from "./header-button";

export interface DemoPersonaOption {
  id: string;
  displayName: string;
  title: string;
}

export interface UserMenuProps {
  user: SessionUser;
  roleLabel: string;
  organizationName: string;
  personas: DemoPersonaOption[];
}

export function UserMenu({ user, roleLabel, organizationName, personas }: UserMenuProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function selectPersona(personaId: string) {
    startTransition(async () => {
      const result = await switchPersona(personaId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const persona = personas.find((item) => item.id === personaId);
      if (persona) toast.info(`Now viewing as ${persona.displayName} (${persona.title}).`);
      router.push("/inventory/overview");
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(headerButtonClass, "gap-2 px-1.5")}
          disabled={isPending}
        >
          <span
            aria-hidden
            className="flex size-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-erp-brand"
          >
            {user.initials}
          </span>
          <span className="sr-only">Account: </span>
          <span className="sr-only max-w-36 truncate text-sm lg:not-sr-only">
            {user.displayName}
          </span>
          <span className="sr-only">, {roleLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-semibold text-erp-text">{user.displayName}</span>
          <span className="block text-xs text-erp-text-muted">
            {roleLabel} · {organizationName}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Demo role</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64">
            <DropdownMenuLabel className="text-xs font-normal text-erp-text-muted">
              View the app as a different role
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={user.id} onValueChange={selectPersona}>
              {personas.map((persona) => (
                <DropdownMenuRadioItem key={persona.id} value={persona.id}>
                  <span className="flex flex-col">
                    <span>{persona.title}</span>
                    <span className="text-xs text-erp-text-muted">{persona.displayName}</span>
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-xs text-erp-text-muted">
          Demo build: sign-in and real accounts arrive with Supabase Auth in Phase 2.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
