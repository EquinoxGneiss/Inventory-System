import { z } from "zod";

/**
 * URL-backed list state (UI/UX spec §4.1 "Persistence"): search, filters,
 * grouping, sorting and pagination live in the query string so they survive
 * refresh, deep links and back navigation. Parsing is tolerant: anything
 * invalid falls back to defaults instead of erroring.
 */

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;
export const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

export type SortDirection = "asc" | "desc";

export interface ListSort<TSort extends string> {
  field: TSort;
  direction: SortDirection;
}

export interface ListQueryConfig<
  TFilter extends string,
  TSort extends string,
  TGroup extends string,
  TFacet extends string,
> {
  filters: readonly TFilter[];
  sortFields: readonly TSort[];
  groupFields: readonly TGroup[];
  /** Free-value parameters such as `category=<id>`. */
  facets: readonly TFacet[];
  defaultSort: ListSort<TSort>;
}

export interface ListQuery<
  TFilter extends string,
  TSort extends string,
  TGroup extends string,
  TFacet extends string,
> {
  q: string;
  filters: TFilter[];
  facets: Partial<Record<TFacet, string>>;
  sort: ListSort<TSort>;
  group: TGroup | null;
  /** 1-based page number. */
  page: number;
  size: number;
}

export type SearchParamsInput =
  URLSearchParams | Record<string, string | string[] | undefined> | ReadonlyURLSearchParamsLike;

interface ReadonlyURLSearchParamsLike {
  get(name: string): string | null;
}

function readParam(input: SearchParamsInput, key: string): string | undefined {
  if (typeof (input as ReadonlyURLSearchParamsLike).get === "function") {
    return (input as ReadonlyURLSearchParamsLike).get(key) ?? undefined;
  }
  const value = (input as Record<string, string | string[] | undefined>)[key];
  return Array.isArray(value) ? value[0] : value;
}

export function defineListQuery<
  TFilter extends string,
  TSort extends string,
  TGroup extends string,
  TFacet extends string = never,
>(config: ListQueryConfig<TFilter, TSort, TGroup, TFacet>) {
  type Query = ListQuery<TFilter, TSort, TGroup, TFacet>;

  const filterSet = new Set<string>(config.filters);
  const sortSet = new Set<string>(config.sortFields);
  const groupSet = new Set<string>(config.groupFields);

  const schema = z.object({
    q: z.string().trim().max(100).catch("").default(""),
    filter: z
      .string()
      .transform((raw) =>
        Array.from(new Set(raw.split(",").filter((key): key is TFilter => filterSet.has(key)))),
      )
      .catch([])
      .default([]),
    sort: z
      .string()
      .transform((raw): ListSort<TSort> => {
        const direction: SortDirection = raw.startsWith("-") ? "desc" : "asc";
        const field = raw.replace(/^-/, "");
        return sortSet.has(field) ? { field: field as TSort, direction } : config.defaultSort;
      })
      .catch(config.defaultSort)
      .default(config.defaultSort),
    group: z
      .string()
      .transform((raw) => (groupSet.has(raw) ? (raw as TGroup) : null))
      .catch(null)
      .default(null),
    page: z.coerce.number().int().min(1).max(100_000).catch(1).default(1),
    size: z.coerce
      .number()
      .int()
      .min(1)
      .transform((value) => Math.min(value, MAX_PAGE_SIZE))
      .catch(DEFAULT_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE),
  });

  const facetSchema = z.string().trim().min(1).max(64);

  function parse(input: SearchParamsInput): Query {
    const parsed = schema.parse({
      q: readParam(input, "q"),
      filter: readParam(input, "filter"),
      sort: readParam(input, "sort"),
      group: readParam(input, "group"),
      page: readParam(input, "page"),
      size: readParam(input, "size"),
    });
    const facets: Partial<Record<TFacet, string>> = {};
    for (const facet of config.facets) {
      const result = facetSchema.safeParse(readParam(input, facet));
      if (result.success) facets[facet] = result.data;
    }
    return {
      q: parsed.q,
      filters: parsed.filter,
      facets,
      sort: parsed.sort,
      group: parsed.group,
      page: parsed.page,
      size: parsed.size,
    };
  }

  /** Serialize, omitting defaults so URLs stay short. */
  function toSearchParams(query: Query): URLSearchParams {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.filters.length) params.set("filter", query.filters.join(","));
    for (const facet of config.facets) {
      const value = query.facets[facet];
      if (value) params.set(facet, value);
    }
    const isDefaultSort =
      query.sort.field === config.defaultSort.field &&
      query.sort.direction === config.defaultSort.direction;
    if (!isDefaultSort) {
      params.set("sort", `${query.sort.direction === "desc" ? "-" : ""}${query.sort.field}`);
    }
    if (query.group) params.set("group", query.group);
    if (query.page !== 1) params.set("page", String(query.page));
    if (query.size !== DEFAULT_PAGE_SIZE) params.set("size", String(query.size));
    return params;
  }

  return { config, parse, toSearchParams };
}

export function serializeSort(sort: ListSort<string>): string {
  return `${sort.direction === "desc" ? "-" : ""}${sort.field}`;
}

export interface PageResult<T> {
  rows: T[];
  total: number;
  page: number;
  size: number;
  /** Per-group totals across all pages, when grouping is active. */
  groupCounts: Record<string, number> | null;
}

/** Clamp a requested page to the available range after filtering. */
export function clampPage(page: number, size: number, total: number): number {
  const lastPage = Math.max(1, Math.ceil(total / size));
  return Math.min(Math.max(1, page), lastPage);
}
