import { PackageSearch } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/erp/feedback/empty-state";
import { PageContainer } from "@/components/erp/page-header/erp-page-header";
import { Button } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <PageContainer>
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={PackageSearch}
          title="Product not available"
          description="This product doesn't exist in the active organization's catalog, or you don't have access to it."
          action={
            <Button asChild variant="outline">
              <Link href="/inventory/products">Back to products</Link>
            </Button>
          }
        />
      </div>
    </PageContainer>
  );
}
