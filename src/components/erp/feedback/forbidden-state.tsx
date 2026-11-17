import { ShieldAlert } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";

export interface ForbiddenStateProps {
  title?: string;
  description?: string;
}

/**
 * Shown when the current role lacks the permission for a page. Pages render
 * this server-side; it is not the security boundary, which stays on the server
 * and (from Phase 2) in the database.
 */
export function ForbiddenState({
  title = "You don't have access to this page",
  description = "Your role in this organization doesn't include this area. Ask an organization administrator if you need access.",
}: ForbiddenStateProps) {
  return (
    <div className="rounded-lg border bg-card">
      <EmptyState
        icon={ShieldAlert}
        title={title}
        description={description}
        action={
          <Button asChild variant="outline">
            <Link href="/inventory/overview">Go to Overview</Link>
          </Button>
        }
      />
    </div>
  );
}
