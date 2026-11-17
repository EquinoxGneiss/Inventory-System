import type { Metadata } from "next";
import { Suspense } from "react";

import { DataTableSkeleton } from "@/components/erp/data-table/data-table-skeleton";
import { ForbiddenState } from "@/components/erp/feedback/forbidden-state";
import { ERPPageHeader, PageContainer } from "@/components/erp/page-header/erp-page-header";
import { hasPermission } from "@/lib/authorization/permissions";
import { getSessionContext } from "@/lib/demo/session";
import { getProduct } from "@/features/products/data/product-repository";
import { RequestsListView } from "@/features/requests/components/requests-list-view";
import { listRequests, visibleBuildings } from "@/features/requests/data/request-repository";
import {
  REQUEST_FILTERS,
  REQUEST_FILTER_META,
  requestListQuery,
} from "@/features/requests/request-list-config";

export const metadata: Metadata = { title: "Requests" };

export default function RequestsPage(props: PageProps<"/inventory/requests">) {
  return (
    <PageContainer>
      <ERPPageHeader
        breadcrumbs={[{ label: "Inventory", href: "/inventory/overview" }, { label: "Requests" }]}
        title="Inventory Requests"
      />
      <Suspense fallback={<DataTableSkeleton columns={8} />}>
        <RequestsSection searchParams={props.searchParams} />
      </Suspense>
    </PageContainer>
  );
}

async function RequestsSection({
  searchParams,
}: {
  searchParams: PageProps<"/inventory/requests">["searchParams"];
}) {
  const session = await getSessionContext();
  if (!hasPermission(session, "requests:read")) return <ForbiddenState />;

  const query = requestListQuery.parse(await searchParams);
  const result = listRequests(session, query);
  const productId = query.facets.product;
  const product = productId ? getProduct(session, productId) : null;

  return (
    <>
      <p className="-mt-2 text-xs text-erp-text-muted">
        {session.organization.name}
        {session.buildingScope ? " · Showing requests for your assigned buildings" : null}
      </p>
      <RequestsListView
        rows={result.rows}
        total={result.total}
        page={result.page}
        size={result.size}
        sort={query.sort}
        group={query.group}
        groupCounts={result.groupCounts}
        availableFilters={REQUEST_FILTERS.filter((filter) => {
          const permission = REQUEST_FILTER_META[filter].permission;
          return !permission || hasPermission(session, permission);
        })}
        buildings={visibleBuildings(session).map(({ id, name }) => ({ id, name }))}
        productFacet={
          product
            ? { id: product.product.id, label: `${product.product.sku} ${product.product.name}` }
            : null
        }
        canCreate={hasPermission(session, "requests:create")}
        hasQuery={Boolean(
          query.q || query.filters.length || query.facets.building || query.facets.product,
        )}
      />
    </>
  );
}
