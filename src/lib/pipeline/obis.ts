// OBIS (Ocean Biodiversity Information System) API client for the Salt Safari species data pipeline
// Docs: https://api.obis.org/ (Swagger), https://manual.obis.org
// No auth required. No published rate limits.

import type {
  RawSpeciesRecord,
  LocationQuery,
  PipelineResult,
  PipelineError,
} from "./types";

const BASE_URL = "https://api.obis.org/v3";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert a point + radius to a WKT bounding box polygon.
 * OBIS does not support point+radius queries — WKT is required.
 * WKT uses longitude-first coordinate order.
 */
export function pointToBBox(lat: number, lng: number, radiusKm: number): string {
  const latDelta = radiusKm / 111.32;
  const lngDelta = radiusKm / (111.32 * Math.cos(lat * Math.PI / 180));
  const minLng = lng - lngDelta;
  const maxLng = lng + lngDelta;
  const minLat = lat - latDelta;
  const maxLat = lat + latDelta;
  return `POLYGON((${minLng} ${minLat}, ${maxLng} ${minLat}, ${maxLng} ${maxLat}, ${minLng} ${maxLat}, ${minLng} ${minLat}))`;
}

// --- HTTP with retry ---

async function fetchWithRetry(
  url: string,
  maxRetries = 3
): Promise<{ data: unknown; ok: true } | { error: PipelineError; ok: false }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await sleep(1000 * (attempt + 1));
    } else {
      await sleep(500);
    }

    console.log(`[OBIS] GET ${url}`);
    let response: Response;
    try {
      response = await fetch(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[OBIS] Network error: ${message}`);
      if (attempt < maxRetries) continue;
      return {
        ok: false,
        error: { type: "network_error", message, url },
      };
    }

    if (response.ok) {
      const data = await response.json();
      console.log(`[OBIS] ${response.status} — ${url.split("?")[0]}`);
      return { ok: true, data };
    }

    if (response.status === 429) {
      const waitMs = 2000 * Math.pow(2, attempt);
      console.warn(`[OBIS] 429 rate limited, waiting ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
      if (attempt < maxRetries) {
        await sleep(waitMs);
        continue;
      }
      return {
        ok: false,
        error: { type: "rate_limit", message: "Rate limited after retries", url, statusCode: 429 },
      };
    }

    if (response.status >= 500) {
      const waitMs = 2000 * (attempt + 1);
      console.warn(`[OBIS] ${response.status} server error, waiting ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
      if (attempt < maxRetries) {
        await sleep(waitMs);
        continue;
      }
      return {
        ok: false,
        error: { type: "server_error", message: `Server error ${response.status}`, url, statusCode: response.status },
      };
    }

    console.warn(`[OBIS] ${response.status} client error, skipping`);
    return {
      ok: false,
      error: { type: "client_error", message: `Client error ${response.status}`, url, statusCode: response.status },
    };
  }

  return {
    ok: false,
    error: { type: "network_error", message: "Max retries exceeded", url: "" },
  };
}

// --- Species query ---

function buildChecklistUrl(location: LocationQuery): string {
  const wkt = pointToBBox(location.lat, location.lng, location.radiusKm);
  const params = new URLSearchParams({
    geometry: wkt,
    taxonid: "2",   // Animalia — critical, without it results are overwhelmingly microbial
    size: "500",
  });
  return `${BASE_URL}/checklist?${params}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseChecklistResult(result: any): RawSpeciesRecord {
  return {
    scientificName: result.scientificName,
    commonName: null, // OBIS has NO common names
    inatTaxonId: null,
    wormsAphiaId: result.taxonID ?? null, // OBIS taxonID IS the WoRMS AphiaID
    observationCount: result.records ?? 0,
    photoUrl: null,
    source: "obis" as const,
    kingdom: result.kingdom ?? null,
    phylum: result.phylum ?? null,
    class: result.class ?? null,
    order: result.order ?? null,
    family: result.family ?? null,
    genus: result.genus ?? null,
    isEndemic: null,
    isNative: null,
    isIntroduced: null,
  };
}

/**
 * Query OBIS for marine animal species at a location.
 * Uses the /checklist endpoint with a WKT bounding box.
 * Returns species with WoRMS AphiaIDs and full taxonomy.
 */
export async function queryOBISSpecies(
  location: LocationQuery
): Promise<PipelineResult> {
  const url = buildChecklistUrl(location);
  const result = await fetchWithRetry(url);

  if (!result.ok) {
    console.error(`[OBIS] Failed to fetch species: ${result.error.message}`);
    return {
      source: "obis",
      location,
      species: [],
      errors: [result.error],
      queriedAt: new Date().toISOString(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = result.data as any;
  const total = data.total ?? 0;
  const results = data.results ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const species = results.map((r: any) => parseChecklistResult(r));

  console.log(`[OBIS] Total species reported: ${total}`);
  console.log(`[OBIS] Species returned (page): ${species.length}`);

  return {
    source: "obis",
    location,
    species,
    errors: [],
    queriedAt: new Date().toISOString(),
  };
}
