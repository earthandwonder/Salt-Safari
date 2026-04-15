import { test, expect } from "@playwright/test";

/**
 * Smoke tests — visit every public route and verify it loads without crashing.
 * These catch SSR errors, missing data handling, broken imports, and 500s.
 */

const publicRoutes = [
  { path: "/", name: "Homepage" },
  { path: "/locations", name: "Regions index" },
  { path: "/species", name: "Species browse" },
  { path: "/login", name: "Login" },
  { path: "/signup", name: "Signup" },
  { path: "/id", name: "Species ID tool" },
  { path: "/privacy", name: "Privacy policy" },
  { path: "/terms", name: "Terms of service" },
  { path: "/dmca", name: "DMCA" },
  { path: "/credits", name: "Credits" },
];

for (const route of publicRoutes) {
  test(`Smoke: ${route.name} (${route.path}) loads without error`, async ({
    page,
  }) => {
    const response = await page.goto(route.path);
    expect(response?.status()).toBeLessThan(500);
    // Page should have a title
    await expect(page).toHaveTitle(/.+/);
    // No uncaught errors in the page
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    // Wait for hydration
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });
}

test("Smoke: 404 page returns proper status for unknown route", async ({
  page,
}) => {
  const response = await page.goto("/this-route-does-not-exist-12345");
  expect(response?.status()).toBe(404);
});
