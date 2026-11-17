import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { ForbiddenState } from "@/components/erp/feedback/forbidden-state";
import { ERPPageHeader, PageContainer } from "@/components/erp/page-header/erp-page-header";
import { RecordSkeleton } from "@/components/erp/record-form/record-skeleton";
import { hasPermission } from "@/lib/authorization/permissions";
import { getSessionContext } from "@/lib/demo/session";
import { formatDateTime, manilaToday } from "@/lib/format";
import { getBuilding } from "@/features/organizations/data/mock-organizations";
import { listProductOptions } from "@/features/products/data/product-repository";
import {
  getRequest,
  isOverdue,
  requestableBuildings,
} from "@/features/requests/data/request-repository";
import { canEditDraft } from "@/features/requests/domain/request-access";
import { CLOSED_STATUSES } from "@/features/requests/domain/request-status";
import { RequestDetailView } from "@/features/requests/components/request-detail-view";
import { RequestDraftForm } from "@/features/requests/components/request-draft-form";
import {
  RequestCommands,
  RequestStatusBar,
  requestSecondaryTabs,
} from "@/features/requests/components/request-record-parts";
import { REQUEST_LIST_PATH } from "@/features/requests/request-list-config";

export const metadata: Metadata = { title: "Request" };

export default function RequestDetailPage(props: PageProps<"/inventory/requests/[requestId]">) {
  return (
    <PageContainer>
      <Suspense fallback={<RecordSkeleton />}>
        <RequestDetailSection params={props.params} />
      </Suspense>
    </PageContainer>
  );
}

async function RequestDetailSection({
  params,
}: {
  params: PageProps<"/inventory/requests/[requestId]">["params"];
}) {
  const session = await getSessionContext();
  if (!hasPermission(session, "requests:read")) return <ForbiddenState />;

  const { requestId } = await params;
  const request = getRequest(session, requestId);
  // Missing and out-of-scope requests look the same (no existence leak).
  if (!request) notFound();

  const buildingName = getBuilding(request.buildingId)?.name ?? request.buildingId;
  const header = (
    <ERPPageHeader
      breadcrumbs={[
        { label: "Inventory", href: "/inventory/overview" },
        { label: "Requests", href: REQUEST_LIST_PATH, restoreListQuery: true },
        { label: request.reference },
      ]}
      title={request.reference}
      subtitle={`${session.organization.name} · ${buildingName}`}
    />
  );

  if (canEditDraft(session, request)) {
    // Reading the clock must happen at request time (Cache Components).
    await connection();
    const today = manilaToday();
    const buildings = requestableBuildings(session);
    return (
      <>
        {header}
        <RequestDraftForm
          requestId={request.id}
          title={request.reference}
          context={
            <>
              {session.organization.name} · Requested by {request.requesterName} ·{" "}
              {formatDateTime(request.requestDate)}
            </>
          }
          initialValues={{
            buildingId: request.buildingId,
            requiredDate: request.requiredDate,
            priority: request.priority,
            notes: request.notes,
            lines: request.lines.map((line) => ({
              productId: line.productId,
              quantity: line.requested,
            })),
          }}
          buildings={buildings.map(({ id, name }) => ({ id, name }))}
          products={listProductOptions(session)}
          canSeeStock={hasPermission(session, "stock:read")}
          today={today}
          statusBar={<RequestStatusBar status={request.status} />}
          commands={<RequestCommands status={request.status} holder={session} />}
          secondaryTabs={requestSecondaryTabs(request)}
          listHref={REQUEST_LIST_PATH}
        />
      </>
    );
  }

  const readOnlyReason = CLOSED_STATUSES.has(request.status)
    ? "This request is closed. Posted quantities can only be corrected through follow-up operations."
    : request.status === "draft" || request.status === "changes_requested"
      ? "Only the requester or the building manager can edit this draft."
      : "Submitted requests can't be edited. Changes go through the approval workflow.";

  return (
    <>
      {header}
      <RequestDetailView
        request={request}
        buildingName={buildingName}
        organizationName={session.organization.name}
        isOverdue={isOverdue(request)}
        holder={session}
        readOnlyReason={readOnlyReason}
      />
    </>
  );
}
