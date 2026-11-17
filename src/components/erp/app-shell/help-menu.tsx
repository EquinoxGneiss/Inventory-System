"use client";

import { CircleHelp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { headerButtonClass } from "./header-button";

const SHORTCUTS = [
  { keys: "Ctrl / ⌘ + K", action: "Search records and pages" },
  { keys: "Tab / Shift + Tab", action: "Move between controls" },
  { keys: "Enter", action: "Open the focused record" },
  { keys: "Esc", action: "Close menus and dialogs" },
];

export function HelpMenu() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={headerButtonClass} aria-label="Help">
          <CircleHelp aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="mb-2 text-sm font-semibold">Keyboard shortcuts</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.keys} className="contents">
              <dt>
                <kbd className="rounded border bg-erp-surface-muted px-1.5 py-0.5 text-xs">
                  {shortcut.keys}
                </kbd>
              </dt>
              <dd className="text-erp-text-muted">{shortcut.action}</dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
}
