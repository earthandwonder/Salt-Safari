// iNaturalist photo search module (supplementary source)
// Only cc0, cc-by, cc-by-sa photos (~10-20% of iNat photos pass this filter)
// Rate limit: 60 req/min (shared with species pipeline)

import type { PipelineError } from "../types";

const API_URL = "https://api.inaturalist.org/v1";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const LICENSE_MAP: Record<string, string> = {
  "cc0": "CC0",
  "cc-by": "CC BY",
  "cc-by-sa": "CC BY-SA",
};

export type INatPhoto = {
  url: string; // direct photo URL (large size)
  observerName: string;
  license: string;
  licenseCode: string;
  observationId: number;
  sourceUrl: string; // observation page URL
  width: number | null;
  height: number | null;
};

type INatPhotoSearchResult = {
  photos: INatPhoto[];
  errors: PipelineError[];
};

/**
 * Search iNaturalist for CC-licensed photos of a species near a location.
 */
export async function searchINatPhotos(
  taxonId: number,
  lat: number,
  lng: number,
  radiusKm: number,
  maxResults = 5
): Promise<INatPhotoSearchResult> {
  const errors: PipelineError[] = [];

  const params = new URLSearchParams({
    taxon_id: String(taxonId),
    lat: String(lat),
    lng: String(lng),
    radius: String(radiusKm),
    photo_license: "cc0,cc-by,cc-by-sa",
    per_page: String(Math.min(maxResults * 2, 10)), // fetch extra in case some lack photos
    order_by: "votes",
    quality_grade: "research",
  });

  const url = `${API_URL}/observations?${params}`;
  console.log(`[iNat Photos] Searching taxon ${taxonId}`);

  await sleep(1000); // Rate limit: 60 req/min

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[iNat Photos] Network error: ${message}`);
    return { photos: [], errors: [{ type: "network_error", message, url }] };
  }

  if (response.status === 429) {
    console.warn("[iNat Photos] Rate limited, waiting 30s");
    await sleep(30000);
    return { photos: [], errors: [{ type: "rate_limit", message: "Rate limited", url, statusCode: 429 }] };
  }

  if (!response.ok) {
    const message = `HTTP ${response.status}`;
    console.error(`[iNat Photos] ${message}`);
    return {
      photos: [],
      errors: [{ type: "server_error", message, url, statusCode: response.status }],
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await response.json() as any;
  const results = data?.results ?? [];
  const photos: INatPhoto[] = [];

  for (const obs of results) {
    if (!obs.photos || obs.photos.length === 0) continue;

    // Use the first (best) photo from the observation
    const photo = obs.photos[0];
    const licenseCode: string = photo.license_code ?? "";

    if (!LICENSE_MAP[licenseCode]) continue;

    // Build large photo URL — replace "square" with "large" in the URL
    const photoUrl: string = photo.url?.replace("/square.", "/large.") ?? "";
    if (!photoUrl) continue;

    const observerName: string = obs.user?.name || obs.user?.login || "Unknown";

    photos.push({
      url: photoUrl,
      observerName,
      license: LICENSE_MAP[licenseCode],
      licenseCode,
      observationId: obs.id,
      sourceUrl: `https://www.inaturalist.org/observations/${obs.id}`,
      width: photo.original_dimensions?.width ?? null,
      height: photo.original_dimensions?.height ?? null,
    });

    if (photos.length >= maxResults) break;
  }

  console.log(`[iNat Photos] Found ${photos.length} CC-licensed photos for taxon ${taxonId}`);

  return { photos, errors };
}
