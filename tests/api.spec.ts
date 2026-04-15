import { test, expect } from "@playwright/test";

test.describe("API routes", () => {
  test("GET /api/sightings returns valid response", async ({ request }) => {
    const response = await request.get("/api/sightings");
    // Should either return data or require auth (401), not crash (500)
    expect(response.status()).toBeLessThan(500);
  });

  test("GET /api/alerts returns valid response", async ({ request }) => {
    const response = await request.get("/api/alerts");
    expect(response.status()).toBeLessThan(500);
  });

  test("POST /api/sightings without auth returns 401", async ({ request }) => {
    const response = await request.post("/api/sightings", {
      data: { species_id: "fake", location_id: "fake" },
    });
    expect(response.status()).toBe(401);
  });

  test("POST /api/alerts without auth returns 401", async ({ request }) => {
    const response = await request.post("/api/alerts", {
      data: { species_id: "fake", location_id: "fake" },
    });
    expect(response.status()).toBe(401);
  });

  test("DELETE /api/sightings/fake-id without auth returns 401", async ({
    request,
  }) => {
    const response = await request.delete("/api/sightings/fake-id");
    expect(response.status()).toBe(401);
  });

  test("DELETE /api/alerts/fake-id without auth returns 401", async ({
    request,
  }) => {
    const response = await request.delete("/api/alerts/fake-id");
    expect(response.status()).toBe(401);
  });

  test("GET /api/species/identify returns valid response", async ({
    request,
  }) => {
    // Species identify is a GET endpoint, not POST
    const response = await request.get("/api/species/identify");
    expect(response.status()).toBeLessThan(500);
  });

  test("POST /api/cron/alerts without secret is rejected", async ({
    request,
  }) => {
    const response = await request.post("/api/cron/alerts");
    expect(response.status()).toBeLessThan(500);
    expect(response.status()).not.toBe(200);
  });
});
