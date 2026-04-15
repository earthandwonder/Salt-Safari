import { test, expect } from "@playwright/test";

/**
 * Mobile-specific tests — only run in the mobile-safari project.
 */
test.describe("Mobile layout", () => {
  test("homepage renders properly on mobile viewport", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Mobile-only test");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // No horizontal overflow (common mobile bug)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // 5px tolerance
  });

  test("locations page has no horizontal overflow on mobile", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Mobile-only test");
    await page.goto("/locations");
    await page.waitForLoadState("networkidle");

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });

  test("species page has no horizontal overflow on mobile", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Mobile-only test");
    await page.goto("/species");
    await page.waitForLoadState("networkidle");

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });

  test("text is readable on mobile (no tiny fonts)", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Mobile-only test");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check that body text isn't below 12px (common mobile readability issue)
    const smallTextCount = await page.evaluate(() => {
      const elements = document.querySelectorAll("p, span, a, li");
      let tooSmall = 0;
      elements.forEach((el) => {
        const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
        if (fontSize < 12 && el.textContent && el.textContent.trim().length > 0) {
          tooSmall++;
        }
      });
      return tooSmall;
    });
    // Allow a few small elements (icons, labels) but flag if many
    expect(smallTextCount).toBeLessThan(10);
  });
});
