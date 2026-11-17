"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, use, useCallback, useMemo, useTransition, type ReactNode } from "react";

/**
 * Shared URL-state access for one list page: the control panel and the table
 * both read the query string and push updates through the same transition, so
 * the table can show a pending state while the server renders the next page.
 */
interface ListStateValue {
  searchParams: URLSearchParams;
  isPending: boolean;
  /** Merge changes into the query string. `null` removes a key. Resets page by default. */
  update: (changes: Record<string, string | null>, options?: { resetPage?: boolean }) => void;
  /** Replace the whole query string (saved views, clear all). */
  replace: (search: string) => void;
}

const ListStateContext = createContext<ListStateValue | null>(null);

export function ListStateProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const readonlyParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const searchParams = useMemo(
    () => new URLSearchParams(readonlyParams.toString()),
    [readonlyParams],
  );

  const navigate = useCallback(
    (search: string) => {
      startTransition(() => {
        router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
      });
    },
    [pathname, router],
  );

  const update = useCallback<ListStateValue["update"]>(
    (changes, options) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      if (options?.resetPage ?? true) next.delete("page");
      navigate(next.toString());
    },
    [navigate, searchParams],
  );

  const value = useMemo<ListStateValue>(
    () => ({ searchParams, isPending, update, replace: navigate }),
    [searchParams, isPending, update, navigate],
  );

  return <ListStateContext value={value}>{children}</ListStateContext>;
}

export function useListState(): ListStateValue {
  const value = use(ListStateContext);
  if (!value) throw new Error("useListState must be used inside <ListStateProvider>");
  return value;
}
