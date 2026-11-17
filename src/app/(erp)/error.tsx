"use client";

import { ErrorState } from "@/components/erp/feedback/error-state";
import { PageContainer } from "@/components/erp/page-header/erp-page-header";

function digestOf(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "digest" in error) {
    const digest = (error as { digest?: unknown }).digest;
    return typeof digest === "string" ? digest : undefined;
  }
  return undefined;
}

/** Route-level error boundary for the ERP workspace. Never shows raw error details. */
export default function ERPError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <PageContainer>
      <ErrorState digest={digestOf(error)} onRetry={retry} />
    </PageContainer>
  );
}
