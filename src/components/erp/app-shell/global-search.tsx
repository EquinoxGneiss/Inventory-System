"use client";

import { FileText, LayoutList, Package, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { VisibleNavModule } from "@/features/navigation/nav-config";
import { searchRecords, type SearchResults } from "@/features/search/actions";
import { cn } from "@/lib/utils";
import { headerButtonClass } from "./header-button";

const EMPTY: SearchResults = { products: [], requests: [] };

export interface GlobalSearchProps {
  navigation: VisibleNavModule[];
}

/** Global search / command palette (spec §2.3), opened with Ctrl/Cmd + K. */
export function GlobalSearch({ navigation }: GlobalSearchProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const trimmed = term.trim();
    const timer = window.setTimeout(() => {
      if (!trimmed) {
        setResults(EMPTY);
        return;
      }
      startTransition(async () => {
        const next = await searchRecords(trimmed);
        setResults(next);
      });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [term]);

  const pages = useMemo(() => {
    const needle = term.trim().toLowerCase();
    const items = navigation.flatMap((module) => [
      ...(module.href ? [{ label: module.label, href: module.href, context: "Inventory" }] : []),
      ...module.items.flatMap((item) =>
        item.href ? [{ label: item.label, href: item.href, context: module.label }] : [],
      ),
    ]);
    return needle
      ? items.filter((item) => `${item.context} ${item.label}`.toLowerCase().includes(needle))
      : items.slice(0, 6);
  }, [navigation, term]);

  function go(href: string) {
    setOpen(false);
    setTerm("");
    router.push(href);
  }

  return (
    <>
      <Button
        variant="ghost"
        className={cn(
          headerButtonClass,
          "hidden gap-2 bg-white/10 md:inline-flex md:w-56 md:justify-start",
        )}
        onClick={() => setOpen(true)}
        aria-keyshortcuts="Control+K Meta+K"
      >
        <Search aria-hidden />
        <span className="flex-1 text-left text-white/85">Search…</span>
        <kbd className="rounded border border-white/30 px-1.5 font-sans text-[11px] text-white/85">
          Ctrl K
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(headerButtonClass, "md:hidden")}
        onClick={() => setOpen(true)}
        aria-label="Search"
      >
        <Search aria-hidden />
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search InventoryOS"
        description="Search products by name, SKU or barcode, requests by reference, or jump to a page."
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search products, request references, pages…"
            value={term}
            onValueChange={setTerm}
            aria-label="Search"
          />
          <CommandList>
            <CommandEmpty>
              {isPending ? "Searching…" : term.trim() ? "No matching records." : "Type to search."}
            </CommandEmpty>
            {results.products.length > 0 ? (
              <CommandGroup heading="Products">
                {results.products.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={`product-${product.id}`}
                    onSelect={() => go(`/inventory/products/${product.id}`)}
                  >
                    <Package aria-hidden />
                    <span className="font-mono text-xs text-erp-text-muted">{product.sku}</span>
                    <span className="truncate">{product.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {results.requests.length > 0 ? (
              <CommandGroup heading="Requests">
                {results.requests.map((request) => (
                  <CommandItem
                    key={request.id}
                    value={`request-${request.id}`}
                    onSelect={() => go(`/inventory/requests/${request.id}`)}
                  >
                    <FileText aria-hidden />
                    <span className="font-medium">{request.reference}</span>
                    <span className="truncate text-erp-text-muted">
                      {request.buildingName} · {request.statusLabel}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {pages.length > 0 ? (
              <CommandGroup heading="Pages">
                {pages.map((page) => (
                  <CommandItem
                    key={page.href}
                    value={`page-${page.href}`}
                    onSelect={() => go(page.href)}
                  >
                    <LayoutList aria-hidden />
                    <span>{page.label}</span>
                    <span className="text-erp-text-muted">{page.context}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
