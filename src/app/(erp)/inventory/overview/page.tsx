import {
  AlarmClock,
  ChartColumn,
  ClipboardCheck,
  ClipboardList,
  FilePen,
  PackageOpen,
  PackageSearch,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/erp/feedback/empty-state";
import { StatusBadge } from "@/components/erp/feedback/status-badge";
import { OperationCard } from "@/components/erp/overview/operation-card";
import { ERPPageHeader, PageContainer } from "@/components/erp/page-header/erp-page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { hasAnyPermission, hasPermission, type Permission } from "@/lib/authorization/permissions";
import type { SessionContext } from "@/lib/authorization/types";
import { DEMO_AS_OF } from "@/lib/demo/constants";
import { getSessionContext } from "@/lib/demo/session";
import { formatDate, formatDateTime, formatQuantity } from "@/lib/format";
import {
  countLowStockProducts,
  listLowStockProducts,
} from "@/features/products/data/product-repository";
import {
  countRequestQueues,
  listRecentRequests,
} from "@/features/requests/data/request-repository";
import { REQUEST_STATUS_META } from "@/features/requests/domain/request-status";
import { countShortNextMonth } from "@/features/forecasting/data/forecast-repository";
import { FORECAST_MONTH_LABEL } from "@/features/forecasting/domain/forecast";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return (
    <PageContainer>
      <ERPPageHeader
        breadcrumbs={[{ label: "Inventory", href: "/inventory/overview" }, { label: "Overview" }]}
        title="Operations Overview"
      />
      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewSection />
      </Suspense>
    </PageContainer>
  );
}

interface CardSpec {
  key: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  count: number;
  tone?: "default" | "attention" | "critical";
  /** Any one of these permissions shows the card. */
  permissions: Permission[];
  /** Additional visibility rule. */
  when?: (session: SessionContext) => boolean;
}

async function OverviewSection() {
  const session = await getSessionContext();
  const canReadRequests = hasPermission(session, "requests:read");
  const queues = canReadRequests ? countRequestQueues(session) : null;
  const lowStockCount = countLowStockProducts(session);
  const shortNextMonth = countShortNextMonth(session);

  const cards: CardSpec[] = [
    {
      key: "approve",
      title: "Requests to Approve",
      description: "Submitted or under review",
      href: "/inventory/requests?filter=pending_approval&sort=request_date",
      icon: ClipboardCheck,
      count: queues?.pending_approval ?? 0,
      tone: "attention",
      permissions: ["requests:approve"],
    },
    {
      key: "reserve",
      title: "Awaiting Reservation",
      description: "Approved, stock not fully reserved",
      href: "/inventory/requests?filter=awaiting_reservation",
      icon: PackageSearch,
      count: queues?.awaiting_reservation ?? 0,
      tone: "attention",
      permissions: ["releases:prepare"],
    },
    {
      key: "release",
      title: "Ready for Release",
      description: "Reserved and waiting for Org Admin release",
      href: "/inventory/requests?filter=ready_for_release",
      icon: PackageOpen,
      count: queues?.ready_for_release ?? 0,
      permissions: ["releases:prepare", "releases:post"],
    },
    {
      key: "receipt",
      title: "Awaiting Receipt",
      description: "Released and in transit to buildings",
      href: "/inventory/requests?filter=awaiting_receipt",
      icon: Truck,
      count: queues?.awaiting_receipt ?? 0,
      permissions: ["requests:read"],
    },
    {
      key: "mine",
      title: "My Open Requests",
      description: "Requests you raised that aren't closed",
      href: "/inventory/requests?filter=mine",
      icon: ClipboardList,
      count: queues?.mine_open ?? 0,
      permissions: ["requests:create"],
      when: (current) => current.buildingScope !== null,
    },
    {
      key: "drafts",
      title: "Drafts & Revisions",
      description: "Not yet submitted, or returned for changes",
      href: "/inventory/requests?filter=drafts",
      icon: FilePen,
      count: queues?.drafts ?? 0,
      permissions: ["requests:create"],
      when: (current) => current.buildingScope !== null,
    },
    {
      key: "overdue",
      title: "Overdue Requests",
      description: "Past the required date and still open",
      href: "/inventory/requests?filter=overdue&sort=required_date",
      icon: AlarmClock,
      count: queues?.overdue ?? 0,
      tone: "critical",
      permissions: ["requests:read"],
    },
    {
      key: "low-stock",
      title: "Low Stock",
      description: "Available below the reorder threshold",
      href: "/inventory/products?filter=low_stock&sort=available",
      icon: ShieldCheck,
      count: lowStockCount,
      tone: "attention",
      permissions: ["stock:read"],
    },
    {
      key: "short-next-month",
      title: "Short Next Month",
      description: `Forecast need for ${FORECAST_MONTH_LABEL} exceeds stock`,
      href: "/inventory/reports/forecast?filter=short",
      icon: ChartColumn,
      count: shortNextMonth,
      tone: "critical",
      permissions: ["stock:read"],
    },
  ];

  const visibleCards = cards.filter(
    (card) =>
      hasAnyPermission(session, card.permissions) && (card.when ? card.when(session) : true),
  );

  if (visibleCards.length === 0) {
    return (
      <div className="rounded-lg border bg-card">
        <EmptyState
          title="No inventory queues for your role"
          description="Your role in this organization doesn't include inventory permissions. Platform administrators manage configuration and don't approve or release stock."
        />
      </div>
    );
  }

  const lowStock = listLowStockProducts(session, 8);
  const recent = canReadRequests ? listRecentRequests(session, 8) : [];

  return (
    <div className="flex flex-col gap-5">
      <p className="-mt-2 text-xs text-erp-text-muted">
        {session.organization.name}
        {session.buildingScope ? " · Your assigned buildings" : ""} · Demo data as of{" "}
        {formatDateTime(DEMO_AS_OF)}
      </p>
      <section
        aria-label="Work queues"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
      >
        {visibleCards.map((card) => (
          <OperationCard
            key={card.key}
            title={card.title}
            description={card.description}
            href={card.href}
            icon={card.icon}
            count={card.count}
            tone={card.tone}
          />
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {canReadRequests ? (
          <section aria-labelledby="recent-requests" className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 id="recent-requests" className="text-[17px] font-semibold">
                Recent requests
              </h2>
              <Link href="/inventory/requests" className="text-sm text-erp-brand hover:underline">
                View all
              </Link>
            </div>
            {recent.length === 0 ? (
              <EmptyState size="compact" title="No requests yet" />
            ) : (
              <ul className="divide-y">
                {recent.map((request) => {
                  const status = REQUEST_STATUS_META[request.status];
                  return (
                    <li key={request.id}>
                      <Link
                        href={`/inventory/requests/${request.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-erp-surface-muted/60"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{request.reference}</span>
                          <span className="block truncate text-xs text-erp-text-muted">
                            {request.buildingName} · {request.requesterName} ·{" "}
                            {formatDate(request.requestDate)}
                          </span>
                        </span>
                        <StatusBadge label={status.label} tone={status.tone} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}

        {hasPermission(session, "stock:read") ? (
          <section aria-labelledby="low-stock" className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 id="low-stock" className="text-[17px] font-semibold">
                Lowest stock
              </h2>
              <Link
                href="/inventory/products?filter=low_stock&sort=available"
                className="text-sm text-erp-brand hover:underline"
              >
                View all
              </Link>
            </div>
            {lowStock.length === 0 ? (
              <EmptyState size="compact" title="Nothing below its reorder threshold" />
            ) : (
              <ul className="divide-y">
                {lowStock.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/inventory/products/${product.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-erp-surface-muted/60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{product.name}</span>
                        <span className="block text-xs text-erp-text-muted">
                          <span className="font-mono">{product.sku}</span> · minimum{" "}
                          {formatQuantity(product.minimum ?? "0", product.uom)}
                        </span>
                      </span>
                      <span className="text-right text-sm font-semibold text-erp-warning tabular-nums">
                        {formatQuantity(product.available ?? "0", product.uom)}
                        <span className="block text-xs font-normal text-erp-text-muted">
                          available
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading overview">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-[118px] rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  );
}
