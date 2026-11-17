import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ForbiddenState } from "@/components/erp/feedback/forbidden-state";
import { ERPPageHeader, PageContainer } from "@/components/erp/page-header/erp-page-header";
import { RecordSkeleton } from "@/components/erp/record-form/record-skeleton";
import { hasPermission } from "@/lib/authorization/permissions";
import { getSessionContext } from "@/lib/demo/session";
import { ProductDetailView } from "@/features/products/components/product-detail";
import {
  countProductRequests,
  getProduct,
  listProductMovements,
  warehouseScopeLabel,
} from "@/features/products/data/product-repository";
import { PRODUCT_LIST_PATH } from "@/features/products/product-list-config";

export const metadata: Metadata = { title: "Product" };

export default function ProductDetailPage(props: PageProps<"/inventory/products/[productId]">) {
  return (
    <PageContainer>
      <Suspense fallback={<RecordSkeleton />}>
        <ProductDetailSection params={props.params} />
      </Suspense>
    </PageContainer>
  );
}

async function ProductDetailSection({
  params,
}: {
  params: PageProps<"/inventory/products/[productId]">["params"];
}) {
  const session = await getSessionContext();
  if (!hasPermission(session, "products:read")) return <ForbiddenState />;

  const { productId } = await params;
  const detail = getProduct(session, productId);
  if (!detail) notFound();

  return (
    <>
      <ERPPageHeader
        breadcrumbs={[
          { label: "Inventory", href: "/inventory/overview" },
          { label: "Products", href: PRODUCT_LIST_PATH, restoreListQuery: true },
          { label: detail.product.sku },
        ]}
        title={detail.product.name}
        subtitle={session.organization.name}
      />
      <ProductDetailView
        detail={detail}
        movements={listProductMovements(session, productId)}
        requestCount={countProductRequests(session, productId)}
        scopeLabel={`${warehouseScopeLabel(session)} (central warehouse)`}
      />
    </>
  );
}
