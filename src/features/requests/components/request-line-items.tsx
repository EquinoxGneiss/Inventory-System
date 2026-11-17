"use client";

import { Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { RelatedRecordPicker } from "@/components/erp/record-form/related-record-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProductOption } from "@/features/products/types";
import { MAX_REQUEST_LINES, type RequestDraftInput } from "../domain/request-schemas";

export interface RequestLineItemsProps {
  products: ProductOption[];
  canSeeStock: boolean;
}

/**
 * EditableLineItems for request drafts (spec §9): product picker + quantity per
 * line with per-cell validation. Only the requested quantity is editable;
 * approved/reserved/released/received are set by later workflow commands.
 */
export function RequestLineItems({ products, canSeeStock }: RequestLineItemsProps) {
  const { control, formState, register } = useFormContext<RequestDraftInput>();
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const lines = useWatch({ control, name: "lines" });
  const byId = new Map(products.map((product) => [product.id, product]));
  const lineErrors = formState.errors.lines;
  const rootError = lineErrors?.root?.message ?? lineErrors?.message;

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="sr-only">Requested products</caption>
          <thead className="bg-erp-surface-muted text-xs text-erp-text-subtle">
            <tr className="border-b">
              <th scope="col" className="w-10 px-3 py-2 text-left font-semibold">
                #
              </th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">
                Product
              </th>
              {canSeeStock ? (
                <th scope="col" className="w-32 px-3 py-2 text-right font-semibold">
                  Available now
                </th>
              ) : null}
              <th scope="col" className="w-48 px-3 py-2 text-left font-semibold">
                Requested quantity
              </th>
              <th scope="col" className="w-14 px-3 py-2">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => {
              const productId = lines?.[index]?.productId ?? "";
              const product = byId.get(productId);
              const productError = lineErrors?.[index]?.productId?.message;
              const quantityError = lineErrors?.[index]?.quantity?.message;
              const productInputId = `line-${index}-product`;
              const quantityInputId = `line-${index}-quantity`;
              const takenIds = new Set(
                (lines ?? [])
                  .map((line, lineIndex) => (lineIndex === index ? "" : line?.productId))
                  .filter(Boolean),
              );
              return (
                <tr key={field.id} className="border-b align-top last:border-b-0">
                  <td className="px-3 py-2.5 text-erp-text-muted tabular-nums">{index + 1}</td>
                  <td className="px-3 py-2">
                    <Controller
                      control={control}
                      name={`lines.${index}.productId`}
                      render={({ field: productField }) => (
                        <RelatedRecordPicker
                          id={productInputId}
                          aria-label={`Product for line ${index + 1}`}
                          aria-invalid={Boolean(productError)}
                          aria-describedby={productError ? `${productInputId}-error` : undefined}
                          value={productField.value}
                          onChange={productField.onChange}
                          placeholder="Select a product…"
                          searchPlaceholder="Search name or SKU…"
                          options={products.map((option) => ({
                            value: option.id,
                            label: option.name,
                            description: option.sku,
                            hint:
                              option.available !== null
                                ? `${formatQuantity(option.available, option.uom)} avail.`
                                : option.uom,
                            disabled: takenIds.has(option.id),
                          }))}
                        />
                      )}
                    />
                    {productError ? (
                      <p
                        id={`${productInputId}-error`}
                        role="alert"
                        className="mt-1 text-xs text-erp-danger"
                      >
                        {productError}
                      </p>
                    ) : null}
                  </td>
                  {canSeeStock ? (
                    <td className="px-3 py-2.5 text-right text-erp-text-subtle tabular-nums">
                      {product?.available != null
                        ? formatQuantity(product.available, product.uom)
                        : "—"}
                    </td>
                  ) : null}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Input
                        id={quantityInputId}
                        inputMode="decimal"
                        autoComplete="off"
                        aria-label={`Quantity for line ${index + 1}${product ? ` in ${product.uom}` : ""}`}
                        aria-invalid={Boolean(quantityError)}
                        aria-describedby={quantityError ? `${quantityInputId}-error` : undefined}
                        className="text-right tabular-nums"
                        {...register(`lines.${index}.quantity`)}
                      />
                      <span className="w-12 shrink-0 text-xs text-erp-text-muted">
                        {product?.uom ?? ""}
                      </span>
                    </div>
                    {quantityError ? (
                      <p
                        id={`${quantityInputId}-error`}
                        role="alert"
                        className="mt-1 text-xs text-erp-danger"
                      >
                        {quantityError}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-2 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove line ${index + 1}`}
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ productId: "", quantity: "" }, { shouldFocus: false })}
          disabled={fields.length >= MAX_REQUEST_LINES}
        >
          <Plus aria-hidden />
          Add a product
        </Button>
        <p
          className={cn(
            "text-xs",
            rootError ? "font-medium text-erp-danger" : "text-erp-text-muted",
          )}
          role={rootError ? "alert" : undefined}
        >
          {rootError ??
            "Request quantities in each product's stock unit. Approved quantities may be lower than requested."}
        </p>
      </div>
    </div>
  );
}
