import { expect, test } from "@playwright/test";

import { actAs, open } from "./helpers";

test.describe("Products list and detail", () => {
  test.beforeEach(async ({ page }) => {
    await actAs(page, "persona-org-admin", "org-nbh");
  });

  test("search, sort and pagination are URL-backed", async ({ page }) => {
    await open(page, "/inventory/products");
    await expect(page.getByText(/^1–50 of \d+/)).toBeVisible();

    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(/^51–100 of/)).toBeVisible();

    await page.getByRole("button", { name: /^SKU/ }).click();
    await expect(page).toHaveURL(/sort=sku/);
    await expect(page).not.toHaveURL(/page=2/);
    await expect(page.getByRole("columnheader", { name: /SKU/ })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );

    await page.getByRole("searchbox", { name: "Search products" }).fill("bond paper");
    await expect(page).toHaveURL(/q=bond\+paper|q=bond%20paper/);
    const rows = page.getByRole("table").getByRole("row");
    await expect(rows).toHaveCount(5); // header + 4 bond paper products
  });

  test("filters by preset and groups by category", async ({ page }) => {
    await open(page, "/inventory/products");
    await page.getByRole("button", { name: "Filters" }).click();
    await page.getByRole("menuitemcheckbox", { name: "Low Stock" }).click();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/filter=low_stock/);
    await expect(page.getByRole("button", { name: "Remove Low Stock" })).toBeVisible();

    await page.getByRole("button", { name: "Group By" }).click();
    await page.getByRole("menuitemradio", { name: "Category" }).click();
    await expect(page).toHaveURL(/group=category/);
    await expect(page.getByRole("columnheader", { name: /^Category: / }).first()).toBeVisible();
  });

  test("returning from a record restores the list context", async ({ page }) => {
    await open(page, "/inventory/products?filter=low_stock&sort=-available");
    const firstProduct = page.getByRole("table").getByRole("row").nth(1).getByRole("link");
    const name = await firstProduct.textContent();
    await firstProduct.click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(name ?? "");
    await page
      .getByRole("navigation", { name: "breadcrumb" })
      .getByRole("link", { name: "Products" })
      .click();
    await expect(page).toHaveURL(/filter=low_stock/);
    await expect(page).toHaveURL(/sort=-available/);
  });

  test("detail tabs show stock by location and history", async ({ page }) => {
    await open(page, "/inventory/products/prd-nbh-ofc-0002");
    await expect(page.getByText("Read-only in this build")).toBeVisible();
    await page.getByRole("tab", { name: /Locations/ }).click();
    await expect(page).toHaveURL(/tab=locations/);
    await expect(page.getByRole("cell", { name: /CWH\/Stock/ }).first()).toBeVisible();
    await page.getByRole("tab", { name: /Movement History/ }).click();
    await expect(page.getByRole("link", { name: /^(REL|RCV)-2026-/ }).first()).toBeVisible();
  });

  test("requesters see products without stock quantities", async ({ page }) => {
    await actAs(page, "persona-requester", "org-nbh");
    await open(page, "/inventory/products");
    await expect(page.getByText("Stock quantities aren't shown for your role")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /On Hand/ })).toHaveCount(0);
  });
});
