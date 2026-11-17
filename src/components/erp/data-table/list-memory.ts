"use client";

import { useSyncExternalStore } from "react";

/**
 * Remembers the last query string used on each list so breadcrumbs on record
 * pages can return to the exact filtered/sorted/paged view (spec §2.4, §8.4).
 * Stored per browser tab in sessionStorage; failures (private mode, blocked
 * storage) silently fall back to the plain list URL.
 */

const KEY_PREFIX = "inventoryos:list:";
const EVENT = "inventoryos:list-memory";

export function rememberListQuery(listPath: string, search: string): void {
  try {
    window.sessionStorage.setItem(KEY_PREFIX + listPath, search);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Storage unavailable — breadcrumbs fall back to the unfiltered list.
  }
}

function readListQuery(listPath: string): string {
  try {
    return window.sessionStorage.getItem(KEY_PREFIX + listPath) ?? "";
  } catch {
    return "";
  }
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Href for a list including its remembered query (plain path during SSR). */
export function useRememberedListHref(listPath: string): string {
  const search = useSyncExternalStore(
    subscribe,
    () => readListQuery(listPath),
    () => "",
  );
  return search ? `${listPath}?${search}` : listPath;
}
