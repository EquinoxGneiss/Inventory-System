import { expect, test } from "@playwright/test";

import { actAs, open } from "./helpers";

test.describe("ERP shell", () => {
  test.beforeEach(async ({ page }) => {
    await actAs(page, "persona-org-admin", "org-nbh");
  });

  test("renders the header, module bar and demo label", async ({ page }) => {
    await open(page, "/");
    await expect(page).toHaveURL(/\/inventory\/overview$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Operations Overview" }),
    ).toBeVisible();
    const modules = page.getByRole("navigation", { name: "Inventory modules" });
    for (const label of [
      "Overview",
      "Operations",
      "Requests",
      "Products",
      "Reporting",
      "Configuration",
    ]) {
      await expect(modules.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(page.getByText("Demo data", { exact: true })).toBeVisible();
  });

  test("shows planned modules as disabled, not as dead links", async ({ page }) => {
    await open(page, "/inventory/overview");
    await page
      .getByRole("navigation", { name: "Inventory modules" })
      .getByText("Operations")
      .click();
    const receipts = page.getByRole("menuitem", { name: /Receipts/ });
    await expect(receipts).toHaveAttribute("aria-disabled", "true");
    await expect(receipts).toContainText("Planned");
  });

  test("overview cards open filtered queues", async ({ page }) => {
    await open(page, "/inventory/overview");
    await page.getByRole("link", { name: /Requests to Approve/ }).click();
    await expect(page).toHaveURL(/filter=pending_approval/);
    await expect(page.getByRole("button", { name: "Remove Pending Approval" })).toBeVisible();
  });

  test("Ctrl+K search opens a product", async ({ page }) => {
    await open(page, "/inventory/overview");
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("combobox").fill("OFC-0001");
    await dialog.getByRole("option", { name: /OFC-0001/ }).click();
    await expect(page).toHaveURL(/\/inventory\/products\/prd-nbh-ofc-0001/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bond Paper A4 70gsm");
  });

  test("switching organization changes the data in scope", async ({ page }) => {
    await open(page, "/inventory/products");
    await expect(page.getByRole("table").getByText(/^OFC-/).first()).toBeVisible();
    await page.getByRole("button", { name: "Organization: Northbridge Holdings" }).click();
    await page.getByRole("menuitemradio", { name: /Lakeside Medical Group/ }).click();
    await expect(
      page.getByRole("button", { name: "Organization: Lakeside Medical Group" }),
    ).toBeVisible();
    await expect(page.getByText(/^Lakeside Medical Group · Quantities/)).toBeVisible();
    await page.getByRole("searchbox", { name: "Search products" }).fill("MED-0001");
    await expect(page.getByRole("table").getByText("MED-0001")).toBeVisible();
  });

  test("role switching changes navigation and actions", async ({ page }) => {
    await actAs(page, "persona-requester", "org-nbh");
    await open(page, "/inventory/overview");
    await expect(page.getByRole("link", { name: /Requests to Approve/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /My Open Requests/ })).toBeVisible();
    const modules = page.getByRole("navigation", { name: "Inventory modules" });
    await expect(modules.getByText("Configuration")).toHaveCount(0);
  });

  test("platform administrators get no inventory queues", async ({ page }) => {
    await actAs(page, "persona-platform-admin", "org-nbh");
    await open(page, "/inventory/overview");
    await expect(page.getByText("No inventory queues for your role")).toBeVisible();
    await open(page, "/inventory/products");
    await expect(page.getByText("You don't have access to this page")).toBeVisible();
  });
});
