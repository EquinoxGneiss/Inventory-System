import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { ForbiddenState } from "@/components/erp/feedback/forbidden-state";
import { ERPPageHeader, PageContainer } from "@/components/erp/page-header/erp-page-header";
import { RecordSkeleton } from "@/components/erp/record-form/record-skeleton";
import { hasPermission } from "@/lib/authorization/permissions";
import { getSessionContext } from "@/lib/demo/session";
import { manilaToday } from "@/lib/format";
import { listProductOptions } from "@/features/products/data/product-repository";
import { requestableBuildings } from "@/features/requests/data/request-repository";
import { emptyRequestDraft } from "@/features/requests/domain/request-schemas";
import { RequestDraftForm } from "@/features/requests/components/request-draft-form";
import { RequestStatusBar } from "@/features/requests/components/request-record-parts";
import { REQUEST_LIST_PATH } from "@/features/requests/request-list-config";

export const metadata: Metadata = { title: "New Request" };

export default function NewRequestPage() {
  return (
    <PageContainer>
      <ERPPageHeader
        breadcrumbs={[
          { label: "Inventory", href: "/inventory/overview" },
          { label: "Requests", href: REQUEST_LIST_PATH, restoreListQuery: true },
          { label: "New" },
        ]}
        title="New Request"
      />
      <Suspense fallback={<RecordSkeleton />}>
        <NewRequestSection />
      </Suspense>
    </PageContainer>
  );
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

async function NewRequestSection() {
  const session = await getSessionContext();
  const buildings = requestableBuildings(session);
  if (!hasPermission(session, "requests:create") || buildings.length === 0) {
    return (
      <ForbiddenState description="Your role can't create inventory requests in this organization." />
    );
  }
  // Reading the clock must happen at request time (Cache Components).
  await connection();
  const today = manilaToday();
  return (
    <RequestDraftForm
      requestId={null}
      title="New request"
      context={
        <>{session.organization.name} · Reference is assigned when the draft is first saved</>
      }
      initialValues={emptyRequestDraft(
        buildings.length === 1 ? buildings[0]!.id : "",
        addDays(today, 7),
      )}
      buildings={buildings.map(({ id, name }) => ({ id, name }))}
      products={listProductOptions(session)}
      canSeeStock={hasPermission(session, "stock:read")}
      today={today}
      statusBar={<RequestStatusBar status="draft" />}
      commands={null}
      secondaryTabs={[]}
      listHref={REQUEST_LIST_PATH}
    />
  );
}
