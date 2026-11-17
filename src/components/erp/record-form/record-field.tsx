"use client";

import type { ReactNode } from "react";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export interface RecordFieldProps {
  /** id of the control; label, description and error are wired to it. */
  id: string;
  label: string;
  required?: boolean;
  description?: ReactNode;
  error?: string;
  className?: string;
  /** Render the control with the accessibility props it must spread. */
  children: (control: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
    "aria-required": boolean | undefined;
  }) => ReactNode;
}

/**
 * Form field with label, help text and a field-level error that explains how
 * to fix the problem (spec §4.5, §10.1). Layout matches ReadOnlyField.
 */
export function RecordField({
  id,
  label,
  required,
  description,
  error,
  className,
  children,
}: RecordFieldProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <Field
      data-invalid={Boolean(error)}
      className={cn("gap-1 sm:grid sm:grid-cols-[11rem_1fr] sm:items-start sm:gap-x-3", className)}
    >
      <FieldLabel htmlFor={id} className="text-[13px] font-medium text-erp-text-subtle sm:pt-2">
        {label}
        {required ? (
          <span aria-hidden className="text-erp-danger">
            *
          </span>
        ) : null}
      </FieldLabel>
      <div className="flex min-w-0 flex-col gap-1">
        {children({
          id,
          "aria-invalid": Boolean(error),
          "aria-describedby": describedBy,
          "aria-required": required || undefined,
        })}
        {description ? (
          <FieldDescription id={descriptionId} className="text-xs">
            {description}
          </FieldDescription>
        ) : null}
        {error ? (
          <FieldError id={errorId} className="text-xs">
            {error}
          </FieldError>
        ) : null}
      </div>
    </Field>
  );
}
