import { Boxes } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ROLE_LABELS } from "@/lib/authorization/roles";
import { DEMO_AS_OF_DATE } from "@/lib/demo/constants";
import { getSessionContext } from "@/lib/demo/session";
import { formatDate } from "@/lib/format";
import { visibleNavigation } from "@/features/navigation/nav-config";
import { DEMO_PERSONAS } from "@/features/organizations/data/mock-organizations";
import { AppSwitcher } from "./app-switcher";
import { GlobalSearch } from "./global-search";
import { HelpMenu } from "./help-menu";
import { MobileNavigation } from "./mobile-navigation";
import { ModuleNavigationBar } from "./module-navigation-bar";
import { NotificationCenter } from "./notification-center";
import { OrganizationSwitcher } from "./organization-switcher";
import { UserMenu } from "./user-menu";

/**
 * ERP application shell (UI-001, spec §2.1/§3.1): 52px global header and 42px
 * module bar, both sticky. Session-dependent parts stream in behind Suspense
 * boundaries so the static frame renders immediately (Cache Components).
 */
export function ERPAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-card px-3 py-2 text-sm font-medium shadow focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to main content
      </a>
      <div className="sticky top-0 z-40">
        <header className="flex h-erp-header items-center gap-1 bg-erp-brand px-2 text-white sm:px-3">
          <Suspense fallback={<span className="size-9 md:hidden" />}>
            <MobileNavigationSlot />
          </Suspense>
          <div className="hidden md:block">
            <AppSwitcher />
          </div>
          <Link
            href="/inventory/overview"
            className="mr-1 flex items-center gap-2 rounded-md px-1.5 py-1 font-semibold tracking-tight text-white"
          >
            <Boxes aria-hidden className="size-5" />
            <span>InventoryOS</span>
          </Link>
          <Suspense fallback={<HeaderSessionFallback />}>
            <HeaderSessionArea />
          </Suspense>
        </header>
        <Suspense fallback={<ModuleBarFallback />}>
          <ModuleNavigationSlot />
        </Suspense>
      </div>
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
    </div>
  );
}

async function HeaderSessionArea() {
  const session = await getSessionContext();
  const navigation = visibleNavigation(session);
  const primaryRole = session.memberships[0]?.role;
  return (
    <>
      <div className="hidden min-w-0 md:block">
        <OrganizationSwitcher active={session.organization} organizations={session.organizations} />
      </div>
      <div className="ml-auto flex items-center gap-0.5">
        <GlobalSearch navigation={navigation} />
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              className="mx-1 hidden rounded-full border border-white/40 px-2 py-0.5 text-xs font-medium text-white sm:inline"
            >
              Demo data
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-64">
            Phase 1 demo build. Records are fictional sample data as of{" "}
            {formatDate(DEMO_AS_OF_DATE)}; nothing you do here is saved or posted.
          </TooltipContent>
        </Tooltip>
        <div className="hidden sm:block">
          <HelpMenu />
        </div>
        <NotificationCenter />
        <UserMenu
          user={session.user}
          roleLabel={primaryRole ? ROLE_LABELS[primaryRole] : "No role"}
          organizationName={session.organization.name}
          personas={DEMO_PERSONAS.map(({ id, displayName, title }) => ({ id, displayName, title }))}
        />
      </div>
    </>
  );
}

async function MobileNavigationSlot() {
  const session = await getSessionContext();
  return (
    <MobileNavigation
      modules={visibleNavigation(session)}
      active={session.organization}
      organizations={session.organizations}
    />
  );
}

async function ModuleNavigationSlot() {
  const session = await getSessionContext();
  return <ModuleNavigationBar modules={visibleNavigation(session)} />;
}

function HeaderSessionFallback() {
  return (
    <>
      <Skeleton className="hidden h-5 w-44 bg-white/15 md:block" />
      <div className="ml-auto flex items-center gap-2">
        <Skeleton className="hidden h-8 w-56 bg-white/15 md:block" />
        <Skeleton className="size-7 rounded-full bg-white/15" />
      </div>
    </>
  );
}

function ModuleBarFallback() {
  return (
    <div className="hidden h-erp-modulebar items-center gap-6 border-b bg-card px-5 md:flex">
      {[64, 80, 72, 72, 76].map((width) => (
        <Skeleton key={width} className="h-4" style={{ width }} />
      ))}
    </div>
  );
}
