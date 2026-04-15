import { test, expect } from "@playwright/test";

test.describe("Search", () => {
  test("search API returns valid JSON", async ({ request }) => {
    const response = await request.get("/api/search?q=fish");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toBeDefined();
    // Should return an array or object with results
    expect(typeof body).toBe("object");
  });

  test("search API handles empty query gracefully", async ({ request }) => {
    const response = await request.get("/api/search?q=");
    // Should return 200 with empty results, not crash
    expect(response.status()).toBeLessThan(500);
  });

  test("search API handles special characters without crashing", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/search?q=" + encodeURIComponent('<script>alert("xss")</script>')
    );
    expect(response.status()).toBeLessThan(500);
  });
});
