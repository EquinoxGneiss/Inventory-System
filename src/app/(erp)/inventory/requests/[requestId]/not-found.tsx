import { FileQuestion } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/erp/feedback/empty-state";
import { PageContainer } from "@/components/erp/page-header/erp-page-header";
import { Button } from "@/components/ui/button";

export default function RequestNotFound() {
  return (
    <PageContainer>
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={FileQuestion}
          title="Request not available"
          description="This request doesn't exist in the active organization, or you don't have access to it. If you switched organizations, the request may belong to the other one."
          action={
            <Button asChild variant="outline">
              <Link href="/inventory/requests">Back to requests</Link>
            </Button>
          }
        />
      </div>
    </PageContainer>
  );
}
