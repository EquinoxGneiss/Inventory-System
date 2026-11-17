import { expect, test } from "@playwright/test";

import { actAs, open } from "./helpers";

test.describe("Stock forecast", () => {
  test.beforeEach(async ({ page }) => {
    await actAs(page, "persona-org-admin", "org-nbh");
  });

  test("is reachable from Reporting and shows tiles, the coverage chart and the table", async ({
    page,
  }) => {
    await open(page, "/inventory/overview");
    await page
      .getByRole("navigation", { name: "Inventory modules" })
      .getByText("Reporting")
      .click();
    await page.getByRole("menuitem", { name: "Stock Forecast" }).click();
    await expect(page).toHaveURL(/\/inventory\/reports\/forecast$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Stock Forecast — December 2026",
    );

    const summary = page.getByRole("region", { name: "Forecast summary" });
    await expect(summary.getByText("Short next month")).toBeVisible();
    const chart = page.getByRole("list", { name: "Lowest coverage for December 2026" });
    await expect(chart.getByRole("listitem")).toHaveCount(10);
    await expect(chart.getByText(/% covered · need/).first()).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("status filters narrow tiles, chart and table together", async ({ page }) => {
    await open(page, "/inventory/reports/forecast");
    await page.getByRole("button", { name: "Filters" }).click();
    await page.getByRole("menuitemcheckbox", { name: "Covered" }).click();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/filter=covered/);
    const summary = page.getByRole("region", { name: "Forecast summary" });
    await expect(summary).toContainText(/Short next month\s*0\s*of/);
    for (const badge of await page
      .getByRole("table")
      .locator("tbody td:last-child")
      .allTextContents()) {
      expect(badge).toContain("Covered");
    }
  });

  test("opens a product's forecast tab with the monthly chart and table view", async ({ page }) => {
    await open(page, "/inventory/reports/forecast?filter=short");
    await page.getByRole("table").getByRole("row").nth(1).getByRole("link").click();
    await expect(page).toHaveURL(/tab=forecast/);
    await expect(page.getByRole("tab", { name: "Forecast" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    const chart = page.getByRole("figure");
    await expect(chart).toContainText("Monthly use and December 2026 need");
    const columns = chart.getByRole("img");
    await expect(columns).toHaveCount(8);
    await columns.last().focus();
    await expect(page.getByRole("tooltip")).toContainText("December 2026 (forecast)");

    await chart.getByText("View as table").click();
    await expect(chart.getByRole("table").getByRole("row")).toHaveCount(9);
    await expect(page.getByText(/Short · \d+% covered/)).toBeVisible();
  });

  test("overview shows how many products run short next month", async ({ page }) => {
    await open(page, "/inventory/overview");
    await page.getByRole("link", { name: /Short Next Month/ }).click();
    await expect(page).toHaveURL(/\/inventory\/reports\/forecast\?filter=short/);
  });

  test("roles without stock visibility can't see forecasts", async ({ page }) => {
    await actAs(page, "persona-requester", "org-nbh");
    await open(page, "/inventory/reports/forecast");
    await expect(page.getByText("You don't have access to this page")).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Inventory modules" }).getByText("Reporting"),
    ).toHaveCount(0);
    await open(page, "/inventory/products/prd-nbh-ofc-0002?tab=forecast");
    await expect(page.getByRole("tab", { name: "Forecast" })).toHaveCount(0);
  });
});
