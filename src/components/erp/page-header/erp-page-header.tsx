import { Fragment, type ReactNode } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ListReturnLink } from "./list-return-link";

export interface BreadcrumbEntry {
  label: string;
  href?: string;
  /** When set, the link restores this list's last query (filters, sort, page). */
  restoreListQuery?: boolean;
}

export interface ERPPageHeaderProps {
  breadcrumbs: BreadcrumbEntry[];
  title: ReactNode;
  /** Short context line under the title (organization, scope…). */
  subtitle?: ReactNode;
  /** Primary/secondary actions shown on the right of the title row. */
  actions?: ReactNode;
  className?: string;
}

/** Page header (spec §8.2 #2): breadcrumb trail, page title and action slots. */
export function ERPPageHeader({
  breadcrumbs,
  title,
  subtitle,
  actions,
  className,
}: ERPPageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Breadcrumb>
        <BreadcrumbList className="text-[13px]">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <Fragment key={`${crumb.label}-${index}`}>
                <BreadcrumbItem>
                  {isLast || !crumb.href ? (
                    <BreadcrumbPage className={cn(!isLast && "text-erp-text-muted")}>
                      {crumb.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      {crumb.restoreListQuery ? (
                        <ListReturnLink listPath={crumb.href}>{crumb.label}</ListReturnLink>
                      ) : (
                        <Link href={crumb.href}>{crumb.label}</Link>
                      )}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast ? <BreadcrumbSeparator /> : null}
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-erp-text">
            {title}
          </h1>
          {subtitle ? <div className="mt-0.5 text-sm text-erp-text-muted">{subtitle}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

/** Standard page padding and max width for workspace content. */
export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1920px] flex-col gap-4 px-3 py-4 sm:px-5 lg:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
