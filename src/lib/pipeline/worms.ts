// WoRMS (World Register of Marine Species) taxonomy resolver
// Docs: https://www.marinespecies.org/rest/
// No auth required. No published rate limits — we use 1 req/sec to be conservative.

import type { PipelineError } from "./types";

const BASE_URL = "https://www.marinespecies.org/rest";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// In-memory cache for the duration of a pipeline run
const aphiaIdCache = new Map<string, number | null>();
const recordCache = new Map<number, WoRMSRecord>();
const vernacularCache = new Map<number, string | null>();

export type WoRMSRecord = {
  aphiaId: number;
  scientificName: string;
  kingdom: string | null;
  phylum: string | null;
  class: string | null;
  order: string | null;
  family: string | null;
  genus: string | null;
  isMarine: boolean;
  isBrackish: boolean;
  isFreshwater: boolean;
  isTerrestrial: boolean;
  status: string; // "accepted", "unaccepted", etc.
  validAphiaId: number | null; // if unaccepted, points to the accepted taxon
};

// --- HTTP with retry ---

async function fetchWithRetry(
  url: string,
  maxRetries = 3
): Promise<{ data: unknown; ok: true; status: number } | { error: PipelineError; ok: false }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Conservative rate limit — no published limits from WoRMS
    await sleep(500);

    console.log(`[WoRMS] GET ${url}`);
    let response: Response;
    try {
      response = await fetch(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[WoRMS] Network error: ${message}`);
      if (attempt < maxRetries) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      return { ok: false, error: { type: "network_error", message, url } };
    }

    // 204 = no content (no match found) — valid response
    if (response.status === 204) {
      return { ok: true, data: null, status: 204 };
    }

    if (response.ok) {
      const data = await response.json();
      return { ok: true, data, status: response.status };
    }

    if (response.status === 429) {
      const waitMs = 3000 * Math.pow(2, attempt);
      console.warn(`[WoRMS] 429 rate limited, waiting ${waitMs}ms`);
      if (attempt < maxRetries) {
        await sleep(waitMs);
        continue;
      }
      return { ok: false, error: { type: "rate_limit", message: "Rate limited", url, statusCode: 429 } };
    }

    if (response.status >= 500) {
      const waitMs = 2000 * (attempt + 1);
      console.warn(`[WoRMS] ${response.status} server error, waiting ${waitMs}ms`);
      if (attempt < maxRetries) {
        await sleep(waitMs);
        continue;
      }
      return { ok: false, error: { type: "server_error", message: `Server error ${response.status}`, url, statusCode: response.status } };
    }

    // 4xx client error — don't retry
    return { ok: false, error: { type: "client_error", message: `Client error ${response.status}`, url, statusCode: response.status } };
  }

  return { ok: false, error: { type: "network_error", message: "Max retries exceeded", url: "" } };
}

// --- Core resolver functions ---

/**
 * Resolve a scientific name to a WoRMS AphiaID.
 * 1. Try exact match (marine_only=true)
 * 2. If no match, try fuzzy match
 * 3. If both fail, return null
 */
export async function resolveToWoRMS(scientificName: string): Promise<number | null> {
  const cacheKey = scientificName.toLowerCase().trim();

  if (aphiaIdCache.has(cacheKey)) {
    const cached = aphiaIdCache.get(cacheKey)!;
    console.log(`[WoRMS] Cache hit for "${scientificName}" → ${cached ?? "null"}`);
    return cached;
  }

  // Step 1: Exact match
  const encodedName = encodeURIComponent(scientificName);
  const exactUrl = `${BASE_URL}/AphiaIDByName/${encodedName}?marine_only=true`;
  const exactResult = await fetchWithRetry(exactUrl);

  if (exactResult.ok && exactResult.data !== null && typeof exactResult.data === "number") {
    const aphiaId = exactResult.data as number;
    if (aphiaId > 0) {
      console.log(`[WoRMS] Exact match: "${scientificName}" → AphiaID ${aphiaId}`);
      aphiaIdCache.set(cacheKey, aphiaId);
      return aphiaId;
    }
  }

  // Step 2: Fuzzy match
  const fuzzyUrl = `${BASE_URL}/AphiaRecordsByMatchNames?scientificnames[]=${encodedName}&marine_only=true`;
  const fuzzyResult = await fetchWithRetry(fuzzyUrl);

  if (fuzzyResult.ok && fuzzyResult.data !== null) {
    // Response is an array of arrays — one per input name
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matches = fuzzyResult.data as any[][];
    if (matches.length > 0 && Array.isArray(matches[0]) && matches[0].length > 0) {
      // Take the first match with match_type "exact" or "phonetic" or "near_1"
      const bestMatch = matches[0].find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (m: any) => m.match_type === "exact" || m.match_type === "phonetic" || m.match_type === "near_1" || m.match_type === "near_2"
      ) ?? matches[0][0];

      if (bestMatch?.AphiaID) {
        const aphiaId = bestMatch.AphiaID as number;
        console.log(`[WoRMS] Fuzzy match: "${scientificName}" → AphiaID ${aphiaId} (${bestMatch.match_type})`);
        aphiaIdCache.set(cacheKey, aphiaId);
        return aphiaId;
      }
    }
  }

  // No match
  console.log(`[WoRMS] No match for "${scientificName}"`);
  aphiaIdCache.set(cacheKey, null);
  return null;
}

/**
 * Get the full WoRMS record for an AphiaID.
 * Returns taxonomy, marine/terrestrial flags, and accepted status.
 */
export async function getWoRMSRecord(aphiaId: number): Promise<WoRMSRecord | null> {
  if (recordCache.has(aphiaId)) {
    return recordCache.get(aphiaId)!;
  }

  const url = `${BASE_URL}/AphiaRecordByAphiaID/${aphiaId}`;
  const result = await fetchWithRetry(url);

  if (!result.ok || result.data === null) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = result.data as any;
  const record: WoRMSRecord = {
    aphiaId: data.AphiaID,
    scientificName: data.scientificname,
    kingdom: data.kingdom ?? null,
    phylum: data.phylum ?? null,
    class: data.class ?? null,
    order: data.order ?? null,
    family: data.family ?? null,
    genus: data.genus ?? null,
    isMarine: data.isMarine === 1,
    isBrackish: data.isBrackish === 1,
    isFreshwater: data.isFreshwater === 1,
    isTerrestrial: data.isTerrestrial === 1,
    status: data.status ?? "unknown",
    validAphiaId: data.valid_AphiaID !== data.AphiaID ? data.valid_AphiaID : null,
  };

  recordCache.set(aphiaId, record);
  return record;
}

/**
 * Get vernacular (common) names for a species by AphiaID.
 * Returns the best English common name, or null.
 */
export async function getWoRMSVernaculars(aphiaId: number): Promise<string | null> {
  if (vernacularCache.has(aphiaId)) {
    return vernacularCache.get(aphiaId)!;
  }

  const url = `${BASE_URL}/AphiaVernacularsByAphiaID/${aphiaId}`;
  const result = await fetchWithRetry(url);

  if (!result.ok || result.data === null) {
    vernacularCache.set(aphiaId, null);
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const names = result.data as any[];
  if (!Array.isArray(names) || names.length === 0) {
    vernacularCache.set(aphiaId, null);
    return null;
  }

  // Prefer English names
  const englishName = names.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (n: any) => n.language_code === "eng" || n.language === "English"
  );
  const name = englishName?.vernacular ?? names[0]?.vernacular ?? null;
  vernacularCache.set(aphiaId, name);
  return name;
}

/**
 * Clear all caches. Call between pipeline runs if needed.
 */
export function clearWoRMSCache(): void {
  aphiaIdCache.clear();
  recordCache.clear();
  vernacularCache.clear();
}
