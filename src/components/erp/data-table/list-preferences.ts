"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Per-viewer list preferences (visible columns, row density) kept in
 * localStorage. These are conveniences only: if storage is unavailable the
 * list renders with defaults.
 */

export type Density = "compact" | "normal";

export interface ListPreferences {
  hiddenColumns: string[] | null;
  density: Density;
}

const KEY_PREFIX = "inventoryos:prefs:";
const EVENT = "inventoryos:prefs";

/** Fallback for this page session when localStorage is blocked (private mode, policies). */
const memory = new Map<string, string>();

function read(listKey: string): string | null {
  try {
    return window.localStorage.getItem(KEY_PREFIX + listKey) ?? memory.get(listKey) ?? null;
  } catch {
    return memory.get(listKey) ?? null;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function parse(raw: string | null): ListPreferences {
  if (!raw) return { hiddenColumns: null, density: "compact" };
  try {
    const value = JSON.parse(raw) as Partial<ListPreferences>;
    return {
      hiddenColumns: Array.isArray(value.hiddenColumns)
        ? value.hiddenColumns.filter((item): item is string => typeof item === "string")
        : null,
      density: value.density === "normal" ? "normal" : "compact",
    };
  } catch {
    return { hiddenColumns: null, density: "compact" };
  }
}

export function useListPreferences(listKey: string) {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(listKey),
    () => null,
  );
  const preferences = useMemo(() => parse(raw), [raw]);

  const save = useCallback(
    (next: Partial<ListPreferences>) => {
      const merged = JSON.stringify({ ...parse(read(listKey)), ...next });
      try {
        window.localStorage.setItem(KEY_PREFIX + listKey, merged);
      } catch {
        // Storage unavailable — keep the preference in memory for this page session.
        memory.set(listKey, merged);
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [listKey],
  );

  return { preferences, save };
}
