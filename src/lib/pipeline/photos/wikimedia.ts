// Wikimedia Commons photo search module
// API docs: https://www.mediawiki.org/wiki/API:Main_page
// Rate limit: 50K req/hour — we add 200ms delay between requests

import type { PipelineError } from "../types";

const API_URL = "https://commons.wikimedia.org/w/api.php";

// Accepted licenses (commercial-friendly only)
const ACCEPTED_LICENSES = new Set([
  "cc-by",
  "cc-by-2.0",
  "cc-by-2.5",
  "cc-by-3.0",
  "cc-by-4.0",
  "cc-by-sa",
  "cc-by-sa-2.0",
  "cc-by-sa-2.5",
  "cc-by-sa-3.0",
  "cc-by-sa-4.0",
  "cc0",
  "cc-zero",
  "public domain",
  "pd",
  "pd-old",
  "pd-usgov",
  "pd-self",
]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Filename patterns that indicate non-photo content (illustrations, book scans, diagrams)
const FILENAME_BLOCKLIST = [
  "eb1911", "encyclopædia", "encyclopaedia", "britannica",
  "plate_", "plate.", "plates_",
  "diagram", "distribution_map", "range_map",
  "drawing", "illustration", "sketch", "chart",
  "fauna_japonica", "naturgeschichte", "historia_natural",
  "smithsonian", "bulletin_", "archivos_", "abhandlungen_",
  "annales_", "journal_", "proceedings_", "memoirs_",
  "museum_specimen", "herbarium", "type_specimen",
  ".pdf", ".tif", ".tiff",
];

// Category patterns that indicate non-photo content
const CATEGORY_BLOCKLIST = [
  "encyclopædia britannica", "pd britannica",
  "botanical illustrations", "zoological illustrations",
  "scientific illustrations", "anatomical illustrations",
  "images from books", "scanned images",
  "naturalis biodiversity center", "museum specimens",
];

function isLikelyPhoto(title: string, categories: string): boolean {
  const titleLower = title.toLowerCase();
  const catsLower = categories.toLowerCase();

  for (const blocked of FILENAME_BLOCKLIST) {
    if (titleLower.includes(blocked)) return false;
  }
  for (const blocked of CATEGORY_BLOCKLIST) {
    if (catsLower.includes(blocked)) return false;
  }
  return true;
}

function isAcceptedLicense(license: string): boolean {
  const normalized = license.toLowerCase().trim().replace(/\s+/g, "-");
  // Check exact match first
  if (ACCEPTED_LICENSES.has(normalized)) return true;
  // Check prefix match for variations
  for (const accepted of ACCEPTED_LICENSES) {
    if (normalized.startsWith(accepted)) return true;
  }
  // Check for "public domain" in the string
  if (normalized.includes("public-domain") || normalized.includes("pd")) return true;
  return false;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}

export type WikimediaPhoto = {
  title: string;
  url: string; // direct image URL
  thumbUrl: string; // 1200px thumbnail
  width: number;
  height: number;
  license: string;
  licenseUrl: string;
  photographer: string;
  sourceUrl: string; // Wikimedia page URL
};

type WikimediaSearchResult = {
  photos: WikimediaPhoto[];
  errors: PipelineError[];
};

/**
 * Search Wikimedia Commons for photos of a species.
 * Searches by scientific name first, optionally by common name as fallback.
 */
export async function searchWikimediaPhotos(
  scientificName: string,
  commonName?: string | null,
  maxResults = 5
): Promise<WikimediaSearchResult> {
  // Try scientific name first
  let result = await doSearch(scientificName, maxResults);
  if (result.photos.length > 0) return result;

  // Fallback to common name
  if (commonName) {
    await sleep(500);
    result = await doSearch(commonName, maxResults);
  }

  return result;
}

async function doSearch(
  searchTerm: string,
  maxResults: number
): Promise<WikimediaSearchResult> {
  const errors: PipelineError[] = [];

  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrnamespace: "6", // File namespace
    gsrsearch: searchTerm,
    gsrlimit: String(Math.min(maxResults * 5, 30)), // fetch extra — many get filtered by license + quality
    prop: "imageinfo",
    iiprop: "url|extmetadata|size|mime",
    iiurlwidth: "1200",
    format: "json",
    origin: "*",
  });

  const url = `${API_URL}?${params}`;
  console.log(`[Wikimedia] Searching: "${searchTerm}"`);

  await sleep(500); // Rate limiting

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": "SaltSafari/1.0 (https://saltsafari.app; hello@saltsafari.app)" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Wikimedia] Network error: ${message}`);
    return { photos: [], errors: [{ type: "network_error", message, url }] };
  }

  if (!response.ok) {
    const message = `HTTP ${response.status}`;
    console.error(`[Wikimedia] ${message}`);
    return {
      photos: [],
      errors: [{ type: "server_error", message, url, statusCode: response.status }],
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await response.json() as any;
  const pages = data?.query?.pages;
  if (!pages) {
    console.log(`[Wikimedia] No results for "${searchTerm}"`);
    return { photos: [], errors };
  }

  const photos: WikimediaPhoto[] = [];

  for (const page of Object.values(pages)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = page as any;
    const imageinfo = p.imageinfo?.[0];
    if (!imageinfo) continue;

    const extmetadata = imageinfo.extmetadata ?? {};

    // Check license
    const licenseRaw = extmetadata.LicenseShortName?.value ?? "";
    if (!licenseRaw || !isAcceptedLicense(licenseRaw)) {
      continue;
    }

    // Skip SVGs, tiny images, and non-JPEG formats (PDFs, TIFFs are usually scans)
    if (imageinfo.width < 600 || imageinfo.height < 400) continue;
    const urlStr: string = imageinfo.url ?? "";
    if (urlStr.toLowerCase().endsWith(".svg")) continue;
    const mime: string = imageinfo.mime ?? "";
    if (mime && !mime.startsWith("image/jpeg") && !mime.startsWith("image/png") && !mime.startsWith("image/webp")) continue;

    // Skip non-photo content (book scans, illustrations, diagrams)
    const title: string = p.title ?? "";
    const categories: string = extmetadata.Categories?.value ?? "";
    if (!isLikelyPhoto(title, categories)) continue;

    // Parse photographer
    const artistHtml = extmetadata.Artist?.value ?? "Unknown";
    const photographer = stripHtml(artistHtml) || "Unknown";

    // License URL
    const licenseUrl = extmetadata.LicenseUrl?.value ?? "";

    // Page URL on Wikimedia
    const sourceUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;

    photos.push({
      title,
      url: imageinfo.url,
      thumbUrl: imageinfo.thumburl ?? imageinfo.url,
      width: imageinfo.width,
      height: imageinfo.height,
      license: licenseRaw,
      licenseUrl,
      photographer,
      sourceUrl,
    });

    if (photos.length >= maxResults) break;
  }

  // Sort by resolution (largest first)
  photos.sort((a, b) => b.width * b.height - a.width * a.height);

  console.log(
    `[Wikimedia] Found ${photos.length} licensed photos for "${searchTerm}"`
  );

  return { photos, errors };
}
