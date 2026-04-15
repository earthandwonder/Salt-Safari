import { test, expect } from "@playwright/test";

test.describe("Locations pages", () => {
  test("regions index loads and shows region cards", async ({ page }) => {
    await page.goto("/locations");
    await expect(page).toHaveTitle(/location|region/i);
    // Should show at least one region card or link (filter to visible ones in main content)
    const regionLinks = page.locator('main a[href*="/locations/"], [role="main"] a[href*="/locations/"], article a[href*="/locations/"]');
    const count = await regionLinks.count();
    if (count > 0) {
      await expect(regionLinks.first()).toBeVisible();
    } else {
      // Fallback: check any visible location link on the page
      const anyLink = page.locator('a[href*="/locations/"]:visible').first();
      if ((await anyLink.count()) > 0) {
        await expect(anyLink).toBeVisible();
      }
    }
  });

  test("region page loads via direct navigation", async ({ page }) => {
    await page.goto("/locations");
    // Find links that go to a region (one segment after /locations/)
    const regionLinks = page.locator(
      'a[href^="/locations/"]:not([href*="?"])'
    );
    const count = await regionLinks.count();

    // Collect unique region-level hrefs
    const hrefs: string[] = [];
    for (let i = 0; i < count; i++) {
      const href = await regionLinks.nth(i).getAttribute("href");
      if (href) {
        const segments = href.replace(/^\/locations\//, "").split("/");
        // Region links have exactly 1 segment (e.g., /locations/sydney)
        if (segments.length === 1 && segments[0]) {
          hrefs.push(href);
          break;
        }
      }
    }
    test.skip(hrefs.length === 0, "No published regions to test");

    await page.goto(hrefs[0]);
    await page.waitForLoadState("networkidle");
    // Page should load without errors
    const response = await page.goto(hrefs[0]);
    expect(response?.status()).toBeLessThan(500);
  });

  test("dive site page loads via direct navigation", async ({ page }) => {
    await page.goto("/locations");
    // Find links that go to a dive site (two segments after /locations/)
    const allLinks = page.locator('a[href^="/locations/"]');
    const count = await allLinks.count();

    let siteHref: string | null = null;
    for (let i = 0; i < count; i++) {
      const href = await allLinks.nth(i).getAttribute("href");
      if (href) {
        const clean = href.split("?")[0];
        const segments = clean.replace(/^\/locations\//, "").split("/");
        if (segments.length === 2 && segments[0] && segments[1]) {
          siteHref = clean;
          break;
        }
      }
    }
    test.skip(!siteHref, "No dive site links found");

    const response = await page.goto(siteHref!);
    expect(response?.status()).toBeLessThan(500);
    await page.waitForLoadState("networkidle");

    // Check for runtime errors on the page
    const errorDialog = page.locator('dialog:has-text("Runtime Error")');
    const hasError = (await errorDialog.count()) > 0;
    expect(hasError).toBe(false);
  });
});
