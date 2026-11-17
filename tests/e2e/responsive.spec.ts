import { expect, test } from "@playwright/test";

import { actAs, open } from "./helpers";

test.describe("Mobile layout", () => {
  test.beforeEach(async ({ page }) => {
    await actAs(page, "persona-building-manager", "org-nbh");
  });

  test("uses drawer navigation and card lists", async ({ page }) => {
    await open(page, "/inventory/overview");
    await expect(page.getByRole("navigation", { name: "Inventory modules" })).toBeHidden();
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    const drawer = page.getByRole("dialog");
    await expect(drawer.getByRole("button", { name: "Northbridge Holdings" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await drawer.getByRole("link", { name: "All Requests" }).click();
    await expect(page).toHaveURL(/\/inventory\/requests$/);
    await expect(page.getByRole("table")).toBeHidden();
    const cards = page.locator("ul li a[href^='/inventory/requests/req-']");
    await expect(cards.first()).toBeVisible();
    await cards.first().click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^REQ-2026-/);
  });

  test("touch targets in the header are at least 44px", async ({ page }) => {
    await open(page, "/inventory/overview");
    const box = await page.getByRole("button", { name: "Open navigation menu" }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
  });
});
