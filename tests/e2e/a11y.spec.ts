import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { actAs, open } from "./helpers";

const PAGES = [
  "/inventory/overview",
  "/inventory/products",
  "/inventory/products/prd-nbh-ofc-0002",
  "/inventory/requests",
  "/inventory/requests/new",
];

test.describe("Accessibility baseline (WCAG 2.2 AA via axe)", () => {
  test.beforeEach(async ({ page }) => {
    await actAs(page, "persona-org-admin", "org-nbh");
  });

  for (const path of PAGES) {
    test(`no serious or critical violations on ${path}`, async ({ page }) => {
      await open(page, path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .exclude("nextjs-portal") // Next.js dev tools overlay
        .analyze();
      const blocking = results.violations.filter(
        (violation) => violation.impact === "serious" || violation.impact === "critical",
      );
      expect(
        blocking.map(
          (violation) =>
            `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`,
        ),
      ).toEqual([]);
    });
  }

  test("no serious or critical violations on a request record", async ({ page }) => {
    await open(page, "/inventory/requests?filter=awaiting_receipt");
    await page.getByRole("table").getByRole("row").nth(1).getByRole("link").click();
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .exclude("nextjs-portal")
      .analyze();
    expect(
      results.violations
        .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
        .map((violation) => violation.id),
    ).toEqual([]);
  });
});
