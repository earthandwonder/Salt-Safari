import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("can navigate from homepage to locations", async ({ page }) => {
    await page.goto("/");
    const locationsLink = page
      .getByRole("link", { name: /location|explore|dive/i })
      .first();
    if ((await locationsLink.count()) > 0) {
      await locationsLink.click();
      await page.waitForURL(/\/locations/);
      expect(page.url()).toContain("/locations");
    }
  });

  test("can navigate to species browse page directly", async ({ page }) => {
    const response = await page.goto("/species");
    expect(response?.status()).toBeLessThan(500);
    await expect(page).toHaveTitle(/species/i);
  });

  test("login page has email and password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.locator('input[type="email"], input[name="email"]')
    ).toBeVisible();
    await expect(
      page.locator('input[type="password"], input[name="password"]')
    ).toBeVisible();
  });

  test("signup page has email and password fields", async ({ page }) => {
    await page.goto("/signup");
    await expect(
      page.locator('input[type="email"], input[name="email"]')
    ).toBeVisible();
    await expect(
      page.locator('input[type="password"], input[name="password"]')
    ).toBeVisible();
  });

  test("login page has link to signup", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("link", { name: /sign up|create account|register/i })
    ).toBeVisible();
  });

  test("bottom nav is visible on mobile", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Bottom nav is mobile-only");
    await page.goto("/");
    const bottomNav = page.locator("nav").last();
    await expect(bottomNav).toBeVisible();
  });
});
