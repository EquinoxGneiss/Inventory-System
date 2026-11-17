import { expect, test } from "@playwright/test";

import { actAs, open } from "./helpers";

test.describe("Inventory requests", () => {
  test("preset filters narrow the queue", async ({ page }) => {
    await actAs(page, "persona-org-admin", "org-nbh");
    await open(page, "/inventory/requests");
    await page.getByRole("button", { name: "Filters" }).click();
    await page.getByRole("menuitemcheckbox", { name: "Pending Approval" }).click();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/filter=pending_approval/);
    const statuses = page.getByRole("table").locator("tbody td:last-child");
    await expect(statuses.first()).toBeVisible();
    for (const text of await statuses.allTextContents()) {
      expect(text).toMatch(/Submitted|Under Review/);
    }
  });

  test("shows the status bar and the role's commands as not yet connected", async ({ page }) => {
    await actAs(page, "persona-org-admin", "org-nbh");
    await open(page, "/inventory/requests?filter=ready_for_release");
    await page.getByRole("table").getByRole("row").nth(1).getByRole("link").click();
    const statusBar = page.getByRole("navigation", { name: "Request status" });
    await expect(statusBar.locator('[aria-current="step"]')).toContainText("Ready for Release");
    const release = page.getByRole("button", { name: "Post Release" });
    await expect(release).toHaveAttribute("aria-disabled", "true");
    await expect(release).toHaveAccessibleDescription(/connected in Phase 5/);
    await expect(page.getByText(/Submitted requests can't be edited/)).toBeVisible();
  });

  test("requester edits a draft with validation, discard confirmation and honest save", async ({
    page,
  }) => {
    await actAs(page, "persona-requester", "org-nbh");
    await open(page, "/inventory/requests?filter=drafts");
    await page.getByRole("table").getByRole("row").nth(1).getByRole("link").click();
    await expect(page.getByText(/nothing is stored yet/i)).toBeVisible();

    const quantity = page.getByRole("textbox", { name: /Quantity for line 1/ });
    await quantity.fill("0");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Quantity must be greater than zero.")).toBeVisible();

    await page.getByRole("button", { name: "Discard" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Discard changes" }).click();
    await expect(page.getByText("Quantity must be greater than zero.")).toHaveCount(0);

    await quantity.fill("3");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Draft validated by the server — not saved")).toBeVisible();
  });

  test("leaving a dirty draft asks for confirmation", async ({ page }) => {
    await actAs(page, "persona-requester", "org-nbh");
    await open(page, "/inventory/requests/new");
    await page.getByRole("textbox", { name: /Notes/ }).fill("Need these for Monday");
    await page
      .getByRole("navigation", { name: "breadcrumb" })
      .getByRole("link", { name: "Requests" })
      .click();
    const dialog = page.getByRole("alertdialog", { name: "Leave without saving?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Keep editing" }).click();
    await expect(page).toHaveURL(/\/requests\/new$/);
  });

  test("a requester cannot open another building's request", async ({ page }) => {
    await actAs(page, "persona-org-admin", "org-nbh");
    await open(page, "/inventory/requests?building=bld-nbh-ops&filter=completed");
    const href = await page
      .getByRole("table")
      .getByRole("row")
      .nth(1)
      .getByRole("link")
      .getAttribute("href");
    expect(href).toMatch(/\/inventory\/requests\/req-nbh-/);

    await actAs(page, "persona-requester", "org-nbh");
    await open(page, href!);
    await expect(page.getByText("Request not available")).toBeVisible();
  });
});
