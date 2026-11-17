"use client";

import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface PendingCommandButtonProps {
  label: string;
  emphasis: "primary" | "secondary" | "danger";
  /** Why the command can't run yet. Shown as tooltip and announced to screen readers. */
  reason: string;
}

/**
 * A workflow command the user is allowed to perform but which isn't connected
 * in this build. Uses aria-disabled (not `disabled`) so keyboard users can still
 * focus it and hear why it's unavailable.
 */
export function PendingCommandButton({ label, emphasis, reason }: PendingCommandButtonProps) {
  const reasonId = useId();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={
            emphasis === "primary" ? "default" : emphasis === "danger" ? "destructive" : "outline"
          }
          aria-disabled="true"
          aria-describedby={reasonId}
          onClick={(event) => event.preventDefault()}
          className="cursor-not-allowed opacity-55"
        >
          {label}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{reason}</TooltipContent>
      <span id={reasonId} className="sr-only">
        {reason}
      </span>
    </Tooltip>
  );
}
