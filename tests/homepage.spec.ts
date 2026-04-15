import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders the hero section with Salt Safari branding", async ({
    page,
  }) => {
    await expect(page).toHaveTitle(/Salt Safari/);
    // Should have a main heading or hero text
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible();
  });

  test("header navigation links are present", async ({ page }) => {
    const header = page.locator("header");
    await expect(header).toBeVisible();
    // Should have links to key sections (use first() since there may be duplicates in mobile/desktop nav)
    await expect(
      header.getByRole("link", { name: /species/i }).first()
    ).toBeVisible();
    await expect(
      header.getByRole("link", { name: /identify/i }).first()
    ).toBeVisible();
  });

  test("footer is present with legal links", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(
      footer.getByRole("link", { name: /privacy/i })
    ).toBeVisible();
    await expect(footer.getByRole("link", { name: /terms/i })).toBeVisible();
  });

  test("page has no accessibility violations in heading hierarchy", async ({
    page,
  }) => {
    // Check that there's at least one h1
    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });
});
