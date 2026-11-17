"use client";

import { Bell } from "lucide-react";

import { EmptyState } from "@/components/erp/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { headerButtonClass } from "./header-button";

/** Notification center shell. Realtime notices connect in Phase 5. */
export function NotificationCenter() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={headerButtonClass}
          aria-label="Notifications"
        >
          <Bell aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
        </div>
        <EmptyState
          size="compact"
          icon={Bell}
          title="No notifications"
          description="Request, approval and receipt notices will appear here once workflow commands are connected (Phase 5)."
        />
      </PopoverContent>
    </Popover>
  );
}
