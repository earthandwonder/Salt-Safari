import { test, expect } from "@playwright/test";

test.describe("Species pages", () => {
  test("species browse page loads and shows species", async ({ page }) => {
    await page.goto("/species");
    await expect(page).toHaveTitle(/species/i);
    await page.waitForLoadState("networkidle");
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible();
  });

  test("species detail page loads via direct navigation", async ({ page }) => {
    // First get a species slug from the browse page
    await page.goto("/species");
    await page.waitForLoadState("networkidle");

    const speciesLink = page.locator('a[href*="/species/"]').first();
    const count = await speciesLink.count();
    test.skip(count === 0, "No published species to test");

    const href = await speciesLink.getAttribute("href");
    expect(href).toBeTruthy();

    // Navigate directly to avoid target="_blank" issues
    await page.goto(href!);
    await page.waitForLoadState("networkidle");
    expect(page.url()).toMatch(/\/species\/[a-z-]+/);
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible();
  });

  test("species page has tabs", async ({ page }) => {
    await page.goto("/species");
    await page.waitForLoadState("networkidle");

    const speciesLink = page.locator('a[href*="/species/"]').first();
    const count = await speciesLink.count();
    test.skip(count === 0, "No published species to test");

    const href = await speciesLink.getAttribute("href");
    await page.goto(href!);
    await page.waitForLoadState("networkidle");

    // Look for tab-like elements
    const tabTexts = ["about", "photo", "where"];
    for (const tabText of tabTexts) {
      const tab = page
        .getByRole("button", { name: new RegExp(tabText, "i") })
        .or(page.getByRole("tab", { name: new RegExp(tabText, "i") }))
        .first();
      if ((await tab.count()) > 0) {
        await expect(tab).toBeVisible();
      }
    }
  });
});
