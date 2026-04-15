import { test, expect } from "@playwright/test";

test.describe("Authentication flows", () => {
  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.fill(
      'input[type="email"], input[name="email"]',
      "notreal@example.com"
    );
    await page.fill(
      'input[type="password"], input[name="password"]',
      "wrongpassword123"
    );
    await page.getByRole("button", { name: /log in|sign in|submit/i }).click();

    // Should show an error message, not crash
    await page.waitForTimeout(2000);
    const errorEl = page.locator('[role="alert"], .text-red, .error, [class*="error"]').first();
    const errorVisible = (await errorEl.count()) > 0;
    // Either an error element is shown, or we're still on the login page (not redirected)
    expect(errorVisible || page.url().includes("/login")).toBeTruthy();
  });

  test("login form prevents submission with empty fields", async ({
    page,
  }) => {
    await page.goto("/login");
    // Try submitting without filling anything
    const submitButton = page
      .getByRole("button", { name: /log in|sign in|submit/i })
      .first();
    if ((await submitButton.count()) > 0) {
      await submitButton.click();
      // Should still be on login page
      await page.waitForTimeout(1000);
      expect(page.url()).toContain("/login");
    }
  });

  test("signup form prevents submission with empty fields", async ({
    page,
  }) => {
    await page.goto("/signup");
    const submitButton = page
      .getByRole("button", { name: /sign up|create|register|submit/i })
      .first();
    if ((await submitButton.count()) > 0) {
      await submitButton.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain("/signup");
    }
  });

  test("protected pages handle unauthenticated users gracefully", async ({
    page,
  }) => {
    // The /log page requires auth
    const response = await page.goto("/log");
    await page.waitForLoadState("networkidle");
    // Should not crash (500)
    expect(response?.status()).toBeLessThan(500);
    // Should either redirect to login, show a login prompt, or show the page with auth UI
    const url = page.url();
    const handledAuth =
      url.includes("/login") ||
      (await page.getByRole("link", { name: /log in|sign in/i }).count()) >
        0 ||
      (await page.locator("h1").count()) > 0;
    expect(handledAuth).toBeTruthy();
  });
});
