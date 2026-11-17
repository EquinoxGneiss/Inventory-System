"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { Controller, FormProvider, useForm, useWatch, type FieldPath } from "react-hook-form";
import { toast } from "sonner";

import { ConfirmActionDialog } from "@/components/erp/feedback/confirm-action-dialog";
import { DemoNotice } from "@/components/erp/feedback/demo-notice";
import { StatusBadge } from "@/components/erp/feedback/status-badge";
import { NotebookTabs, type NotebookTab } from "@/components/erp/record-form/notebook-tabs";
import { RecordField } from "@/components/erp/record-form/record-field";
import { RecordFieldGrid, RecordForm } from "@/components/erp/record-form/record-form";
import { useUnsavedChangesGuard } from "@/components/erp/record-form/use-unsaved-changes-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ProductOption } from "@/features/products/types";
import { validateRequestDraft } from "../actions";
import {
  MAX_NOTES_LENGTH,
  buildRequestDraftSchema,
  type RequestDraft,
  type RequestDraftInput,
} from "../domain/request-schemas";
import {
  REQUEST_PRIORITIES,
  REQUEST_PRIORITY_META,
  REQUEST_STATUS_META,
} from "../domain/request-status";
import { RequestLineItems } from "./request-line-items";

export interface RequestDraftFormProps {
  /** `null` for a new request. */
  requestId: string | null;
  title: string;
  context: ReactNode;
  initialValues: RequestDraftInput;
  buildings: Array<{ id: string; name: string }>;
  products: ProductOption[];
  canSeeStock: boolean;
  /** Today's Manila date from the server, used for required-date validation. */
  today: string;
  statusBar: ReactNode;
  /** Workflow commands (Submit, Cancel) rendered by the server. */
  commands: ReactNode;
  /** Approval history, activity… for existing drafts. */
  secondaryTabs: NotebookTab[];
  listHref: string;
}

/**
 * Editable request draft (REQ-001 UI). Validates with the shared Zod schema on
 * the client, then again on the server via `validateRequestDraft`. Phase 1
 * never persists: the server confirms validation only, and the UI says so.
 */
export function RequestDraftForm({
  requestId,
  title,
  context,
  initialValues,
  buildings,
  products,
  canSeeStock,
  today,
  statusBar,
  commands,
  secondaryTabs,
  listHref,
}: RequestDraftFormProps) {
  const router = useRouter();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => {
    const precision = new Map(products.map((product) => [product.id, product.precision]));
    return buildRequestDraftSchema({
      getProductPrecision: (id) => precision.get(id),
      allowedBuildingIds: buildings.map((building) => building.id),
      today,
    });
  }, [buildings, products, today]);

  const form = useForm<RequestDraftInput, unknown, RequestDraft>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { control, formState, handleSubmit, register, reset, setError } = form;
  const guardDialog = useUnsavedChangesGuard(formState.isDirty && !formState.isSubmitting);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await validateRequestDraft({ requestId, draft: values });
    if (!result.ok) {
      for (const error of result.fieldErrors) {
        setError((error.path || "root") as FieldPath<RequestDraftInput>, {
          message: error.message,
        });
      }
      const message = result.formError ?? "Fix the highlighted fields and try again.";
      setFormError(message);
      toast.error(message);
      return;
    }
    reset(values);
    toast.info("Draft validated by the server — not saved", {
      description: `${result.lineCount} line${result.lineCount === 1 ? "" : "s"} passed validation. This demo build doesn't store requests yet (Phase 5).`,
    });
  });

  const errors = formState.errors;
  const notesLength = useWatch({ control, name: "notes" })?.length ?? 0;

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate aria-label={`Edit ${title}`}>
        <RecordForm
          title={title}
          badges={
            <StatusBadge label={REQUEST_STATUS_META.draft.label} tone="neutral" srPrefix="Status" />
          }
          context={context}
          statusBar={statusBar}
          actions={
            <>
              <Button type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting ? (
                  <Loader2 aria-hidden className="animate-spin" />
                ) : (
                  <Save aria-hidden />
                )}
                {formState.isSubmitting ? "Checking…" : "Save"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={formState.isSubmitting}
                onClick={() =>
                  formState.isDirty ? setConfirmDiscard(true) : router.push(listHref)
                }
              >
                <Undo2 aria-hidden />
                Discard
              </Button>
              {commands}
              {formState.isDirty ? (
                <span className="text-xs text-erp-text-muted" role="status">
                  Unsaved changes
                </span>
              ) : null}
            </>
          }
          notice={
            <DemoNotice>
              <strong className="font-semibold">Demo build:</strong> Save checks your draft on the
              server with the same rules the real command will use, but nothing is stored yet.
            </DemoNotice>
          }
        >
          {formError ? (
            <p
              role="alert"
              className="rounded-md border border-erp-danger/30 bg-erp-danger-tint px-3 py-2 text-sm text-erp-danger"
            >
              {formError}
            </p>
          ) : null}
          <RecordFieldGrid>
            <div className="flex flex-col gap-4">
              <RecordField
                id="buildingId"
                label="Requesting building"
                required
                error={errors.buildingId?.message}
              >
                {(aria) => (
                  <Controller
                    control={control}
                    name="buildingId"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={buildings.length === 1}
                      >
                        <SelectTrigger {...aria} className="w-full" onBlur={field.onBlur}>
                          <SelectValue placeholder="Select a building" />
                        </SelectTrigger>
                        <SelectContent>
                          {buildings.map((building) => (
                            <SelectItem key={building.id} value={building.id}>
                              {building.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </RecordField>
              <RecordField
                id="requiredDate"
                label="Required date"
                required
                error={errors.requiredDate?.message}
                description="When the building needs the items (Asia/Manila)."
              >
                {(aria) => (
                  <Input type="date" min={today} {...aria} {...register("requiredDate")} />
                )}
              </RecordField>
            </div>
            <div className="flex flex-col gap-4">
              <RecordField id="priority" label="Priority" required error={errors.priority?.message}>
                {(aria) => (
                  <Controller
                    control={control}
                    name="priority"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger {...aria} className="w-full" onBlur={field.onBlur}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REQUEST_PRIORITIES.map((priority) => (
                            <SelectItem key={priority} value={priority}>
                              {REQUEST_PRIORITY_META[priority].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </RecordField>
              <RecordField
                id="notes"
                label="Notes"
                error={errors.notes?.message}
                description={`${notesLength}/${MAX_NOTES_LENGTH} characters`}
              >
                {(aria) => <Textarea rows={3} {...aria} {...register("notes")} />}
              </RecordField>
            </div>
          </RecordFieldGrid>
          <NotebookTabs
            label="Request details"
            tabs={[
              {
                value: "lines",
                label: "Requested Products",
                content: <RequestLineItems products={products} canSeeStock={canSeeStock} />,
              },
              ...secondaryTabs,
            ]}
          />
        </RecordForm>
      </form>
      <ConfirmActionDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard your changes?"
        description="The draft goes back to how it was when you opened it."
        confirmLabel="Discard changes"
        tone="destructive"
        onConfirm={() => {
          reset(initialValues);
          setFormError(null);
          if (!requestId) router.push(listHref);
        }}
      />
      {guardDialog}
    </FormProvider>
  );
}
