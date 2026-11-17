"use client";

import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  digest?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = "The page couldn't be loaded. Your data wasn't changed.",
  onRetry,
  digest,
}: ErrorStateProps) {
  return (
    <div role="alert" className="rounded-lg border bg-card">
      <EmptyState
        icon={TriangleAlert}
        title={title}
        description={
          <>
            {description}
            {digest ? (
              <span className="mt-1 block font-mono text-xs text-erp-text-muted">
                Reference: {digest}
              </span>
            ) : null}
          </>
        }
        action={
          onRetry ? (
            <Button variant="outline" onClick={onRetry}>
              Try again
            </Button>
          ) : null
        }
      />
    </div>
  );
}
