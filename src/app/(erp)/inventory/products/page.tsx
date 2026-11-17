import type { Metadata } from "next";
import { Suspense } from "react";

import { DataTableSkeleton } from "@/components/erp/data-table/data-table-skeleton";
import { ForbiddenState } from "@/components/erp/feedback/forbidden-state";
import { ERPPageHeader, PageContainer } from "@/components/erp/page-header/erp-page-header";
import { hasPermission } from "@/lib/authorization/permissions";
import { DEMO_AS_OF } from "@/lib/demo/constants";
import { getSessionContext } from "@/lib/demo/session";
import { formatDateTime } from "@/lib/format";
import { ProductsListView } from "@/features/products/components/products-list-view";
import {
  listCategories,
  listProducts,
  warehouseScopeLabel,
} from "@/features/products/data/product-repository";
import { productListQuery } from "@/features/products/product-list-config";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage(props: PageProps<"/inventory/products">) {
  return (
    <PageContainer>
      <ERPPageHeader
        breadcrumbs={[{ label: "Inventory", href: "/inventory/overview" }, { label: "Products" }]}
        title="Products"
      />
      <Suspense fallback={<DataTableSkeleton columns={9} />}>
        <ProductsSection searchParams={props.searchParams} />
      </Suspense>
    </PageContainer>
  );
}

async function ProductsSection({
  searchParams,
}: {
  searchParams: PageProps<"/inventory/products">["searchParams"];
}) {
  const session = await getSessionContext();
  if (!hasPermission(session, "products:read")) return <ForbiddenState />;

  const query = productListQuery.parse(await searchParams);
  const result = listProducts(session, query);
  const canSeeStock = hasPermission(session, "stock:read");

  return (
    <>
      <p className="-mt-2 text-xs text-erp-text-muted">
        {session.organization.name}
        {canSeeStock ? (
          <>
            {" "}
            · Quantities for {warehouseScopeLabel(session)} locations, as of{" "}
            {formatDateTime(DEMO_AS_OF)} (demo data)
          </>
        ) : (
          " · Stock quantities aren't shown for your role"
        )}
      </p>
      <ProductsListView
        rows={result.rows}
        total={result.total}
        page={result.page}
        size={result.size}
        sort={query.sort}
        group={query.group}
        groupCounts={result.groupCounts}
        canSeeStock={canSeeStock}
        categories={listCategories(session).map(({ id, name }) => ({ id, name }))}
        hasQuery={Boolean(query.q || query.filters.length || query.facets.category)}
      />
    </>
  );
}
