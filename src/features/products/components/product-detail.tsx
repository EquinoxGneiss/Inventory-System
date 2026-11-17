import {
  ArrowLeftRight,
  ChartColumn,
  ClipboardList,
  FileText,
  PackageCheck,
  Paperclip,
  ScrollText,
  Warehouse,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/erp/feedback/empty-state";
import { StatusBadge } from "@/components/erp/feedback/status-badge";
import { NotebookTabs, type NotebookTab } from "@/components/erp/record-form/notebook-tabs";
import {
  ReadOnlyField,
  ReadOnlyFieldList,
  RecordFieldGrid,
  RecordForm,
} from "@/components/erp/record-form/record-form";
import { SmartButton } from "@/components/erp/smart-buttons/smart-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatQuantity } from "@/lib/format";
import { ProductForecastPanel } from "@/features/forecasting/components/product-forecast-panel";
import type { ProductForecast } from "@/features/forecasting/data/forecast-repository";
import { FORECAST_STATUS_META } from "@/features/forecasting/domain/forecast";
import { subtractDecimal } from "@/lib/validation/quantity";
import type { ProductDetail } from "../data/product-repository";
import { PRODUCT_TYPE_LABELS, type ProductMovement } from "../types";

export interface ProductDetailViewProps {
  detail: ProductDetail;
  movements: ProductMovement[];
  requestCount: number;
  scopeLabel: string;
  /** Next-month forecast; null when the role can't see stock or the product is archived. */
  forecast: ProductForecast | null;
}

const LOCATION_TYPE_LABELS: Record<string, string> = {
  internal: "Stock",
  transit: "In transit",
  building: "Building",
  supplier: "Supplier",
  adjustment: "Adjustment",
};

export function ProductDetailView({
  detail,
  movements,
  requestCount,
  scopeLabel,
  forecast,
}: ProductDetailViewProps) {
  const { product, stock, isLowStock, locations } = detail;
  const uom = product.uom.code;
  const canSeeStock = stock !== null;

  const tabs: NotebookTab[] = [
    {
      value: "general",
      label: "General",
      content: (
        <RecordFieldGrid>
          <ReadOnlyFieldList>
            <ReadOnlyField label="Product name">{product.name}</ReadOnlyField>
            <ReadOnlyField label="SKU">
              <span className="font-mono">{product.sku}</span>
            </ReadOnlyField>
            <ReadOnlyField label="Barcode">
              <span className="font-mono">{product.barcode}</span>
            </ReadOnlyField>
            <ReadOnlyField label="Category">{detail.categoryName}</ReadOnlyField>
          </ReadOnlyFieldList>
          <ReadOnlyFieldList>
            <ReadOnlyField label="Product type">{PRODUCT_TYPE_LABELS[product.type]}</ReadOnlyField>
            <ReadOnlyField label="Unit of measure">
              {product.uom.name} ({uom}) ·{" "}
              {product.uom.precision === 0
                ? "whole numbers"
                : `up to ${product.uom.precision} decimal places`}
            </ReadOnlyField>
            <ReadOnlyField label="Description">{product.description}</ReadOnlyField>
          </ReadOnlyFieldList>
        </RecordFieldGrid>
      ),
    },
    {
      value: "inventory",
      label: "Inventory",
      content: (
        <RecordFieldGrid>
          <ReadOnlyFieldList>
            <ReadOnlyField label="Tracking">
              Quantity only (lots and serials are out of scope for v1)
            </ReadOnlyField>
            <ReadOnlyField label="Reorder threshold">
              {canSeeStock ? formatQuantity(product.minimum, uom) : "Not visible for your role"}
            </ReadOnlyField>
          </ReadOnlyFieldList>
          <ReadOnlyFieldList>
            <ReadOnlyField label="Stock scope">{scopeLabel}</ReadOnlyField>
            <ReadOnlyField label="Building stock">
              Not tracked in v1 (pending decision #3 in docs/open-decisions.md)
            </ReadOnlyField>
          </ReadOnlyFieldList>
        </RecordFieldGrid>
      ),
    },
  ];

  if (locations) {
    tabs.push({
      value: "locations",
      label: "Locations",
      count: locations.length,
      content: (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader className="bg-erp-surface-muted">
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">On Hand</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Available</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.locationId}>
                  <TableCell className="font-medium">{location.name}</TableCell>
                  <TableCell>{LOCATION_TYPE_LABELS[location.type] ?? location.type}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQuantity(location.onHand, uom)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQuantity(location.reserved, uom)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {location.type === "internal"
                      ? formatQuantity(subtractDecimal(location.onHand, location.reserved), uom)
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {locations.some((location) => location.type === "transit") ? (
            <p className="border-t px-3 py-2 text-xs text-erp-text-muted">
              In-transit stock is released from the warehouse but not yet confirmed by the receiving
              building, so it is not available at either end.
            </p>
          ) : null}
        </div>
      ),
    });
    tabs.push({
      value: "movements",
      label: "Movement History",
      count: movements.length,
      content:
        movements.length === 0 ? (
          <EmptyState
            size="compact"
            icon={ArrowLeftRight}
            title="No posted movements for this product"
          />
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-erp-surface-muted">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(movement.date)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/inventory/requests/${movement.requestId}?tab=fulfillment`}
                        className="font-medium text-erp-brand hover:underline"
                      >
                        {movement.reference}
                      </Link>
                    </TableCell>
                    <TableCell>{movement.from}</TableCell>
                    <TableCell>{movement.to}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQuantity(movement.quantity, movement.uom)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="border-t px-3 py-2 text-xs text-erp-text-muted">
              Demo history derived from sample releases and receipts. The append-only stock ledger
              arrives in Phase 4.
            </p>
          </div>
        ),
    });
  }

  if (forecast) {
    tabs.push({
      value: "forecast",
      label: "Forecast",
      content: <ProductForecastPanel forecast={forecast} />,
    });
  }

  tabs.push(
    {
      value: "attachments",
      label: "Attachments",
      content: (
        <EmptyState
          size="compact"
          icon={Paperclip}
          title="No attachments"
          description="File uploads to private storage arrive with the product catalog in Phase 3."
        />
      ),
    },
    {
      value: "audit",
      label: "Audit",
      content: (
        <EmptyState
          size="compact"
          icon={ScrollText}
          title={`Last updated ${formatDateTime(product.updatedAt)}`}
          description="A full who/what/when audit trail is recorded once catalog changes are persisted (Phase 3–4)."
        />
      ),
    },
  );

  return (
    <RecordForm
      title={product.name}
      badges={
        <>
          {product.isActive ? (
            <StatusBadge label="Active" tone="success" srPrefix="Status" />
          ) : (
            <StatusBadge label="Archived" tone="muted" srPrefix="Status" />
          )}
          {isLowStock ? <StatusBadge label="Low stock" tone="warning" /> : null}
        </>
      }
      context={
        <>
          <span className="font-mono">{product.sku}</span> · {detail.categoryName} ·{" "}
          {product.uom.name}
        </>
      }
      readOnlyReason="Read-only in this build. Product editing arrives with the catalog in Phase 3."
      smartButtons={
        <>
          {stock ? (
            <>
              <SmartButton
                icon={Warehouse}
                label="On Hand"
                value={formatQuantity(stock.onHand, uom)}
              />
              <SmartButton
                icon={PackageCheck}
                label="Available"
                value={formatQuantity(stock.available, uom)}
                tone={isLowStock ? "warning" : "default"}
              />
              <SmartButton
                icon={ArrowLeftRight}
                label="Movements"
                value={String(movements.length)}
                href={`?tab=movements`}
              />
            </>
          ) : null}
          {forecast ? (
            <SmartButton
              icon={ChartColumn}
              label={`Need (Dec) · ${FORECAST_STATUS_META[forecast.row.status].label}`}
              value={formatQuantity(forecast.row.need, uom)}
              href={`?tab=forecast`}
              tone={forecast.row.status === "covered" ? "default" : "warning"}
            />
          ) : null}
          <SmartButton
            icon={ClipboardList}
            label="Requests"
            value={String(requestCount)}
            href={`/inventory/requests?product=${product.id}`}
          />
          <SmartButton
            icon={FileText}
            label="Documents"
            value="0"
            note="Attachments arrive in Phase 3"
          />
        </>
      }
    >
      <NotebookTabs label="Product details" tabs={tabs} />
    </RecordForm>
  );
}
