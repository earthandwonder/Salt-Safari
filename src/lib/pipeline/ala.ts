// Atlas of Living Australia (ALA) API client for the Salt Safari species data pipeline
// Docs: https://docs.ala.org.au
// No auth required. No published rate limits — we add 500ms delay between calls.

import type {
  RawSpeciesRecord,
  LocationQuery,
  PipelineResult,
  PipelineError,
} from "./types";

const BASE_URL = "https://biocache-ws.ala.org.au/ws";

// Marine taxonomic classes to query
// Do NOT include Reptilia — it pulls terrestrial snakes
const MARINE_CLASS_FILTER = [
  "Actinopterygii",   // bony fish
  "Chondrichthyes",   // sharks and rays
].map((c) => `class:${c}`).join(" OR ");

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- HTTP with retry ---

async function fetchWithRetry(
  url: string,
  maxRetries = 3
): Promise<{ data: unknown; ok: true } | { error: PipelineError; ok: false }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Conservative delay between calls (no published rate limits)
    if (attempt > 0) {
      await sleep(1000 * (attempt + 1));
    } else {
      await sleep(500);
    }

    console.log(`[ALA] GET ${url}`);
    let response: Response;
    try {
      response = await fetch(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ALA] Network error: ${message}`);
      if (attempt < maxRetries) continue;
      return {
        ok: false,
        error: { type: "network_error", message, url },
      };
    }

    if (response.ok) {
      const data = await response.json();
      console.log(`[ALA] ${response.status} — ${url.split("?")[0]}`);
      return { ok: true, data };
    }

    if (response.status === 429) {
      const waitMs = 2000 * Math.pow(2, attempt);
      console.warn(`[ALA] 429 rate limited, waiting ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
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
      console.warn(`[ALA] ${response.status} server error, waiting ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
      if (attempt < maxRetries) {
        await sleep(waitMs);
        continue;
      }
      return {
        ok: false,
        error: { type: "server_error", message: `Server error ${response.status}`, url, statusCode: response.status },
      };
    }

    // Client error (4xx, not 429) — don't retry
    console.warn(`[ALA] ${response.status} client error, skipping`);
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

function buildSpeciesUrl(location: LocationQuery): string {
  const params = new URLSearchParams({
    q: "*:*",
    lat: String(location.lat),
    lon: String(location.lng), // NOTE: ALA uses "lon", not "lng"
    radius: String(location.radiusKm),
    facets: "species",
    pageSize: "0",       // no individual records, just facets
    flimit: "500",       // max species in facet results
    disableQualityFilter: "spatial-suspect", // marine records often flagged incorrectly
  });

  // Filter queries must be appended separately (multiple fq params)
  // Exclude iNaturalist data (already queried directly)
  params.append("fq", '-data_resource_uid:"dr1411"');
  // Only marine fish classes
  params.append("fq", MARINE_CLASS_FILTER);

  return `${BASE_URL}/occurrences/search?${params}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseFacetResults(facetResults: any[]): RawSpeciesRecord[] {
  if (!facetResults || facetResults.length === 0) return [];

  // Find the "species" facet
  const speciesFacet = facetResults.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (f: any) => f.fieldName === "species"
  );
  if (!speciesFacet || !speciesFacet.fieldResult) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return speciesFacet.fieldResult.map((entry: any) => ({
    scientificName: entry.label,
    commonName: null, // ALA faceted search doesn't return common names
    inatTaxonId: null,
    wormsAphiaId: null,
    observationCount: entry.count,
    photoUrl: null,
    source: "ala" as const,
    kingdom: null,
    phylum: null,
    class: null, // Not available from faceted search
    order: null,
    family: null,
    genus: null,
    isEndemic: null,
    isNative: null,
    isIntroduced: null,
  }));
}

/**
 * Query ALA for marine fish species at a location.
 * Uses faceted search to get species names + observation counts.
 * Excludes iNaturalist data to avoid duplication.
 */
export async function queryALASpecies(
  location: LocationQuery
): Promise<PipelineResult> {
  const url = buildSpeciesUrl(location);
  const result = await fetchWithRetry(url);

  if (!result.ok) {
    console.error(`[ALA] Failed to fetch species: ${result.error.message}`);
    return {
      source: "ala",
      location,
      species: [],
      errors: [result.error],
      queriedAt: new Date().toISOString(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = result.data as any;
  const totalRecords = data.totalRecords ?? 0;
  const species = parseFacetResults(data.facetResults ?? []);

  console.log(`[ALA] Total occurrence records: ${totalRecords}`);
  console.log(`[ALA] Unique species: ${species.length}`);

  return {
    source: "ala",
    location,
    species,
    errors: [],
    queriedAt: new Date().toISOString(),
  };
}
