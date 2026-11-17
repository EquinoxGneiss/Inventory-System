import type { Metadata } from "next";
import { Suspense } from "react";

import { DataTableSkeleton } from "@/components/erp/data-table/data-table-skeleton";
import { ForbiddenState } from "@/components/erp/feedback/forbidden-state";
import { ERPPageHeader, PageContainer } from "@/components/erp/page-header/erp-page-header";
import { hasPermission } from "@/lib/authorization/permissions";
import { DEMO_AS_OF } from "@/lib/demo/constants";
import { getSessionContext } from "@/lib/demo/session";
import { formatDateTime } from "@/lib/format";
import { ForecastReportView } from "@/features/forecasting/components/forecast-report-view";
import { listForecast } from "@/features/forecasting/data/forecast-repository";
import { FORECAST_METHOD_TEXT, FORECAST_MONTH_LABEL } from "@/features/forecasting/domain/forecast";
import { forecastListQuery } from "@/features/forecasting/forecast-list-config";
import { listCategories } from "@/features/products/data/product-repository";

export const metadata: Metadata = { title: "Stock Forecast" };

export default function StockForecastPage(props: PageProps<"/inventory/reports/forecast">) {
  return (
    <PageContainer>
      <ERPPageHeader
        breadcrumbs={[
          { label: "Inventory", href: "/inventory/overview" },
          { label: "Reporting" },
          { label: "Stock Forecast" },
        ]}
        title={`Stock Forecast — ${FORECAST_MONTH_LABEL}`}
      />
      <Suspense fallback={<DataTableSkeleton columns={9} />}>
        <ForecastSection searchParams={props.searchParams} />
      </Suspense>
    </PageContainer>
  );
}

async function ForecastSection({
  searchParams,
}: {
  searchParams: PageProps<"/inventory/reports/forecast">["searchParams"];
}) {
  const session = await getSessionContext();
  if (!hasPermission(session, "stock:read")) {
    return (
      <ForbiddenState description="Stock forecasts need stock visibility, which your role in this organization doesn't include." />
    );
  }

  const query = forecastListQuery.parse(await searchParams);
  const result = listForecast(session, query);

  return (
    <>
      <div className="-mt-2 flex flex-col gap-1 text-xs text-erp-text-muted">
        <p>
          {session.organization.name} · Demo forecast as of {formatDateTime(DEMO_AS_OF)} · Active
          products, central warehouse stock
        </p>
        <p className="max-w-4xl">{FORECAST_METHOD_TEXT}</p>
      </div>
      <ForecastReportView
        rows={result.rows}
        total={result.total}
        page={result.page}
        size={result.size}
        sort={query.sort}
        group={query.group}
        groupCounts={result.groupCounts}
        summary={result.summary}
        lowestCoverage={result.lowestCoverage}
        categories={listCategories(session).map(({ id, name }) => ({ id, name }))}
        hasQuery={Boolean(query.q || query.filters.length || query.facets.category)}
      />
    </>
  );
}
