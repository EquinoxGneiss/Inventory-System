import { describe, expect, it } from "vitest";

import { buildSessionContext } from "@/lib/demo/session";
import { compareDecimal } from "@/lib/validation/quantity";
import { getPersona } from "@/features/organizations/data/mock-organizations";
import { productListQuery } from "../product-list-config";
import {
  getProduct,
  listProducts,
  productPrecisionLookup,
  searchProducts,
} from "./product-repository";

function session(personaId: string, orgId = "org-nbh") {
  return buildSessionContext(getPersona(personaId)!, orgId);
}

const admin = session("persona-org-admin");
const requester = session("persona-requester");

describe("product repository", () => {
  it("scopes products to the active organization", () => {
    const nbh = listProducts(admin, productListQuery.parse({ size: "200" }));
    const lmg = listProducts(
      session("persona-org-admin", "org-lmg"),
      productListQuery.parse({ size: "200" }),
    );
    const nbhIds = new Set(nbh.rows.map((row) => row.id));
    expect(lmg.rows.some((row) => nbhIds.has(row.id))).toBe(false);
    expect(getProduct(admin, lmg.rows[0]!.id)).toBeNull();
  });

  it("withholds stock quantities server-side for roles without stock:read", () => {
    const rows = listProducts(requester, productListQuery.parse({})).rows;
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.onHand).toBeNull();
      expect(row.available).toBeNull();
      expect(row.isLowStock).toBeNull();
    }
    // Stock filters are ignored rather than leaking information through counts.
    const lowStock = listProducts(requester, productListQuery.parse({ filter: "low_stock" }));
    const all = listProducts(requester, productListQuery.parse({}));
    expect(lowStock.total).toBe(all.total);
  });

  it("filters low stock using available quantity versus the reorder threshold", () => {
    const result = listProducts(
      admin,
      productListQuery.parse({ filter: "low_stock", size: "200" }),
    );
    expect(result.total).toBeGreaterThan(0);
    for (const row of result.rows) {
      expect(compareDecimal(row.available!.replace(/^-.*/, "0"), row.minimum!)).toBe(-1);
    }
  });

  it("sorts server-side by quantity, not as text", () => {
    const rows = listProducts(
      admin,
      productListQuery.parse({ sort: "-on_hand", size: "200" }),
    ).rows;
    for (let index = 1; index < rows.length; index++) {
      expect(compareDecimal(rows[index - 1]!.onHand!, rows[index]!.onHand!)).toBeGreaterThanOrEqual(
        0,
      );
    }
  });

  it("shows archived products only when asked", () => {
    const active = listProducts(admin, productListQuery.parse({ size: "200" }));
    const archived = listProducts(
      admin,
      productListQuery.parse({ filter: "archived", size: "200" }),
    );
    expect(active.rows.every((row) => row.isActive)).toBe(true);
    expect(archived.total).toBeGreaterThan(0);
    expect(archived.rows.every((row) => !row.isActive)).toBe(true);
  });

  it("searches by SKU, name or exact barcode", () => {
    expect(searchProducts(admin, "OFC-0001")[0]?.sku).toBe("OFC-0001");
    const product = getProduct(admin, searchProducts(admin, "Bond Paper")[0]!.id)!;
    expect(searchProducts(admin, product.product.barcode)[0]?.id).toBe(product.product.id);
  });

  it("only exposes precision for active products in the active organization", () => {
    const lookup = productPrecisionLookup(admin);
    const archived = listProducts(admin, productListQuery.parse({ filter: "archived" })).rows[0]!;
    expect(lookup(archived.id)).toBeUndefined();
    const active = listProducts(admin, productListQuery.parse({})).rows[0]!;
    expect(lookup(active.id)).toBeTypeOf("number");
  });
});
