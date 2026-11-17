import { describe, expect, it } from "vitest";

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, clampPage, defineListQuery } from "./list-query";

const query = defineListQuery({
  filters: ["low_stock", "archived"] as const,
  sortFields: ["name", "sku"] as const,
  groupFields: ["category"] as const,
  facets: ["category"] as const,
  defaultSort: { field: "name", direction: "asc" },
});

describe("URL-backed list query", () => {
  it("falls back to defaults for an empty query string", () => {
    expect(query.parse({})).toEqual({
      q: "",
      filters: [],
      facets: {},
      sort: { field: "name", direction: "asc" },
      group: null,
      page: 1,
      size: DEFAULT_PAGE_SIZE,
    });
  });

  it("parses search, filters, sort, group, facets and paging", () => {
    const parsed = query.parse(
      new URLSearchParams(
        "q=paper&filter=low_stock,archived&sort=-sku&group=category&page=3&size=25&category=cat-1",
      ),
    );
    expect(parsed).toMatchObject({
      q: "paper",
      filters: ["low_stock", "archived"],
      sort: { field: "sku", direction: "desc" },
      group: "category",
      page: 3,
      size: 25,
      facets: { category: "cat-1" },
    });
  });

  it("ignores unknown or malicious values instead of failing", () => {
    const parsed = query.parse({
      filter: "low_stock,drop_table,low_stock",
      sort: "-password",
      group: "secret",
      page: "-4",
      size: "abc",
    });
    expect(parsed.filters).toEqual(["low_stock"]);
    expect(parsed.sort).toEqual({ field: "name", direction: "asc" });
    expect(parsed.group).toBeNull();
    expect(parsed.page).toBe(1);
    expect(parsed.size).toBe(DEFAULT_PAGE_SIZE);
  });

  it("clamps the page size on the server", () => {
    expect(query.parse({ size: "100000" }).size).toBe(MAX_PAGE_SIZE);
  });

  it("serializes without defaults and round-trips", () => {
    const parsed = query.parse({ q: "pen", sort: "-sku", page: "2" });
    const params = query.toSearchParams(parsed);
    expect(params.toString()).toBe("q=pen&sort=-sku&page=2");
    expect(query.parse(params)).toEqual(parsed);
    expect(query.toSearchParams(query.parse({})).toString()).toBe("");
  });

  it("clamps out-of-range pages to the last page", () => {
    expect(clampPage(9, 50, 120)).toBe(3);
    expect(clampPage(2, 50, 0)).toBe(1);
  });
});
