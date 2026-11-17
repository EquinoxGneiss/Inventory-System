"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface NotebookTab {
  value: string;
  label: string;
  /** Optional count shown after the label. */
  count?: number;
  content: ReactNode;
}

/**
 * Notebook tabs for record details (spec §4.2 #6). The active tab is kept in
 * `?tab=` so it survives refresh and deep links; switching uses the History API
 * directly so no server round trip happens.
 */
export function NotebookTabs({
  tabs,
  label,
  paramName = "tab",
}: {
  tabs: NotebookTab[];
  label: string;
  paramName?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams.get(paramName);
  const active = tabs.some((tab) => tab.value === requested) ? requested! : (tabs[0]?.value ?? "");
  const listRef = useRef<HTMLDivElement>(null);

  // On narrow screens the tab strip scrolls; keep the active tab in view
  // (horizontal scroll of the strip only, never the page).
  useEffect(() => {
    const list = listRef.current;
    const trigger = list?.querySelector<HTMLElement>('[data-state="active"]');
    if (!list || !trigger) return;
    const overflowRight =
      trigger.offsetLeft + trigger.offsetWidth - (list.scrollLeft + list.clientWidth);
    const overflowLeft = list.scrollLeft - trigger.offsetLeft;
    if (overflowRight > 0) list.scrollLeft += overflowRight + 16;
    else if (overflowLeft > 0) list.scrollLeft -= overflowLeft + 16;
  }, [active]);

  function onValueChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === tabs[0]?.value) params.delete(paramName);
    else params.set(paramName, value);
    const query = params.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  }

  return (
    <Tabs value={active} onValueChange={onValueChange} className="gap-0">
      <TabsList
        ref={listRef}
        variant="line"
        aria-label={label}
        className="h-auto w-full justify-start gap-0 overflow-x-auto border-b p-0"
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="h-10 flex-none rounded-none px-3 text-sm text-erp-text-subtle after:bg-erp-brand group-data-horizontal/tabs:after:bottom-0 max-md:h-11 data-active:font-semibold data-active:text-erp-brand"
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span className="ml-1.5 rounded-full bg-erp-surface-muted px-1.5 text-xs text-erp-text-subtle tabular-nums">
                {tab.count}
              </span>
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="pt-4">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
