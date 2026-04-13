// iNaturalist API client for the Salt Safari species data pipeline
// Docs: https://api.inaturalist.org/v1/docs/
// Rate limit: 100 req/min hard cap, we target 60 req/min

import type {
  RawSpeciesRecord,
  SeasonalityData,
  INaturalistSpeciesQuery,
  INaturalistSeasonalityQuery,
  LocationQuery,
  PipelineResult,
  PipelineError,
} from "./types";

const BASE_URL = "https://api.inaturalist.org/v1";

// Marine taxon groups — 4 calls per location
const TAXON_GROUPS = [
  { label: "Fish + sharks/rays", taxonIds: "47178,47273" },
  { label: "Cephalopods + nudibranchs", taxonIds: "47459,47113" },
  { label: "Cnidaria + echinoderms", taxonIds: "47534,47549" },
  {
    label: "Sea turtles + cetaceans + seals + syngnathidae + crustaceans",
    taxonIds: "372234,152871,372843,49106,85493",
  },
] as const;

// --- Rate limiter (token bucket, 60 req/min) ---

class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms

  constructor(requestsPerMinute: number) {
    this.maxTokens = requestsPerMinute;
    this.tokens = requestsPerMinute;
    this.lastRefill = Date.now();
    this.refillRate = requestsPerMinute / 60_000;
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    // Wait until a token is available
    const waitMs = Math.ceil((1 - this.tokens) / this.refillRate);
    await sleep(waitMs);
    this.refill();
    this.tokens -= 1;
  }

  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

const rateLimiter = new RateLimiter(60);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- HTTP with retry ---

async function fetchWithRetry(
  url: string,
  maxRetries = 3
): Promise<{ data: unknown; ok: true } | { error: PipelineError; ok: false }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await rateLimiter.acquire();

    console.log(`[iNat] GET ${url}`);
    let response: Response;
    try {
      response = await fetch(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[iNat] Network error: ${message}`);
      if (attempt < maxRetries) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      return {
        ok: false,
        error: { type: "network_error", message, url },
      };
    }

    if (response.ok) {
      const data = await response.json();
      console.log(`[iNat] ${response.status} — ${url.split("?")[0]}`);
      return { ok: true, data };
    }

    // Rate limited — exponential backoff
    if (response.status === 429) {
      const waitMs = 2000 * Math.pow(2, attempt);
      console.warn(`[iNat] 429 rate limited, waiting ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
      if (attempt < maxRetries) {
        await sleep(waitMs);
        continue;
      }
      return {
        ok: false,
        error: { type: "rate_limit", message: "Rate limited after retries", url, statusCode: 429 },
      };
    }

    // Server error — linear backoff
    if (response.status >= 500) {
      const waitMs = 2000 * (attempt + 1);
      console.warn(`[iNat] ${response.status} server error, waiting ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
      if (attempt < maxRetries) {
        await sleep(waitMs);
        continue;
      }
      return {
        ok: false,
        error: {
          type: "server_error",
          message: `Server error ${response.status}`,
          url,
          statusCode: response.status,
        },
      };
    }

    // Client error (4xx, not 429) — don't retry
    console.warn(`[iNat] ${response.status} client error, skipping`);
    return {
      ok: false,
      error: {
        type: "client_error",
        message: `Client error ${response.status}`,
        url,
        statusCode: response.status,
      },
    };
  }

  // Should not reach here, but satisfy TypeScript
  return {
    ok: false,
    error: { type: "network_error", message: "Max retries exceeded", url: "" },
  };
}

// --- Species counts ---

function buildSpeciesCountsUrl(query: INaturalistSpeciesQuery): string {
  const params = new URLSearchParams({
    lat: String(query.lat),
    lng: String(query.lng),
    radius: String(query.radiusKm),
    taxon_ids: query.taxonIds,
    quality_grade: "research",
    geoprivacy: "open",
    per_page: "500",
    locale: "en",
    preferred_place_id: "6744", // Australia
  });
  return `${BASE_URL}/observations/species_counts?${params}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSpeciesCountResult(result: any): RawSpeciesRecord {
  const taxon = result.taxon;

  // Extract endemic/native/introduced from establishment_means
  // The species_counts endpoint returns establishment_means scoped to preferred_place_id
  const establishmentMeans: string | null =
    taxon.preferred_establishment_means ?? taxon.establishment_means?.establishment_means ?? null;

  const isEndemic = establishmentMeans === "endemic" ? true : null;
  const isNative = establishmentMeans === "native" ? true : (isEndemic ? true : null);
  const isIntroduced = establishmentMeans === "introduced" ? true : null;

  return {
    scientificName: taxon.name,
    commonName: taxon.preferred_common_name ?? null,
    inatTaxonId: taxon.id,
    wormsAphiaId: null, // Resolved later via WoRMS (Session 4)
    observationCount: result.count,
    photoUrl: taxon.default_photo?.medium_url ?? null,
    source: "inaturalist",
    // Taxonomy: /species_counts doesn't return ancestor names, only IDs.
    // iconic_taxon_name gives the broad group (e.g. "Actinopterygii").
    // Full hierarchy will be resolved via WoRMS in Session 4.
    kingdom: null,
    phylum: null,
    class: taxon.iconic_taxon_name ?? null,
    order: null,
    family: null,
    genus: null,
    isEndemic,
    isNative,
    isIntroduced,
  };
}

async function querySpeciesCountsForGroup(
  location: LocationQuery,
  taxonIds: string,
  label: string
): Promise<{ species: RawSpeciesRecord[]; errors: PipelineError[] }> {
  const url = buildSpeciesCountsUrl({ ...location, taxonIds });
  const result = await fetchWithRetry(url);

  if (!result.ok) {
    console.error(`[iNat] Failed to fetch ${label}: ${result.error.message}`);
    return { species: [], errors: [result.error] };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = result.data as any;
  const results = data.results ?? [];
  console.log(`[iNat] ${label}: ${results.length} species`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const species = results.map((r: any) => parseSpeciesCountResult(r));
  return { species, errors: [] };
}

/**
 * Query iNaturalist for all marine species at a location.
 * Makes 4 API calls (one per taxon group) and merges results.
 */
export async function queryINaturalistSpecies(
  location: LocationQuery
): Promise<PipelineResult> {
  const allSpecies: RawSpeciesRecord[] = [];
  const allErrors: PipelineError[] = [];

  for (const group of TAXON_GROUPS) {
    const { species, errors } = await querySpeciesCountsForGroup(
      location,
      group.taxonIds,
      group.label
    );
    allSpecies.push(...species);
    allErrors.push(...errors);
  }

  console.log(`[iNat] Total species for (${location.lat}, ${location.lng}): ${allSpecies.length}`);

  return {
    source: "inaturalist",
    location,
    species: allSpecies,
    errors: allErrors,
    queriedAt: new Date().toISOString(),
  };
}

// --- Seasonality (histogram) ---

function buildHistogramUrl(query: INaturalistSeasonalityQuery): string {
  const params = new URLSearchParams({
    lat: String(query.lat),
    lng: String(query.lng),
    radius: String(query.radiusKm),
    taxon_id: String(query.taxonId),
    quality_grade: "research",
    date_field: "observed",
    interval: "month_of_year",
    // NOTE: Do NOT include geoprivacy=open on histogram calls — documented gotcha
  });
  return `${BASE_URL}/observations/histogram?${params}`;
}

/**
 * Query iNaturalist for monthly observation distribution of a species at a location.
 * Returns 12 entries (one per month).
 */
export async function queryINaturalistSeasonality(
  query: INaturalistSeasonalityQuery
): Promise<{ data: SeasonalityData[]; error: PipelineError | null }> {
  const url = buildHistogramUrl(query);
  const result = await fetchWithRetry(url);

  if (!result.ok) {
    return { data: [], error: result.error };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = result.data as any;
  const monthCounts = data.results?.month_of_year ?? {};

  const seasonality: SeasonalityData[] = [];
  for (let month = 1; month <= 12; month++) {
    seasonality.push({
      month,
      observationCount: monthCounts[String(month)] ?? 0,
    });
  }

  return { data: seasonality, error: null };
}
