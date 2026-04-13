// Photo pipeline orchestrator
// For each species: search Wikimedia → fallback to iNat → download → upload to Cloudflare R2
// Records full license audit trail in the photos table

import type { SupabaseClient } from "@supabase/supabase-js";
import { searchWikimediaPhotos } from "./wikimedia";
import { searchINatPhotos } from "./inaturalist";
import { uploadToR2 } from "./r2";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getExtension(url: string): string {
  const match = url.match(/\.(\w{3,4})(?:\?|$)/);
  const ext = match?.[1]?.toLowerCase() ?? "jpg";
  // Normalize jpeg → jpg
  return ext === "jpeg" ? "jpg" : ext;
}

type SpeciesForPhotos = {
  id: string;
  scientific_name: string;
  name: string; // display name (common or scientific)
  slug: string;
  inat_taxon_id: number | null;
  hero_image_url: string | null;
};

type PhotoPipelineOptions = {
  locationSlug: string;
  maxPhotosPerSpecies?: number; // default 1 (hero only; use 3 for hero + 2 additional)
  skipExistingHeroes?: boolean; // default true
  batchSize?: number; // default 0 (all species); set to e.g. 100 to process in smaller batches
  batchOffset?: number; // default 0; skip this many species (for resuming)
};

type PhotoPipelineResult = {
  totalSpecies: number;
  photosDownloaded: number;
  heroesSet: number;
  skippedExisting: number;
  failed: number;
  noPhotosFound: number;
};

/**
 * Run the photo pipeline for all species at a location.
 */
export async function runPhotoPipelineForLocation(
  supabase: SupabaseClient,
  options: PhotoPipelineOptions
): Promise<PhotoPipelineResult> {
  const {
    locationSlug,
    maxPhotosPerSpecies = 1,
    skipExistingHeroes = true,
    batchSize = 0,
    batchOffset = 0,
  } = options;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`[Photo Pipeline] Starting for location: ${locationSlug}`);
  console.log(`${"=".repeat(60)}\n`);

  // Fetch location
  const { data: location, error: locError } = await supabase
    .from("locations")
    .select("id, name, lat, lng, radius_km")
    .eq("slug", locationSlug)
    .single();

  if (locError || !location) {
    console.error(`[Photo Pipeline] Location not found: ${locationSlug}`, locError);
    return { totalSpecies: 0, photosDownloaded: 0, heroesSet: 0, skippedExisting: 0, failed: 0, noPhotosFound: 0 };
  }

  // Fetch all species at this location (paginated for >1000)
  const locationSpecies: Array<{ species_id: string }> = [];
  let lsPage = 0;
  const lsPageSize = 1000;
  while (true) {
    const { data: page, error: lsError } = await supabase
      .from("location_species")
      .select("species_id")
      .eq("location_id", location.id)
      .range(lsPage * lsPageSize, (lsPage + 1) * lsPageSize - 1);
    if (lsError) {
      console.error("[Photo Pipeline] Failed to fetch location_species", lsError);
      break;
    }
    if (!page || page.length === 0) break;
    locationSpecies.push(...page);
    if (page.length < lsPageSize) break;
    lsPage++;
  }

  if (locationSpecies.length === 0) {
    console.error("[Photo Pipeline] No species found at location");
    return { totalSpecies: 0, photosDownloaded: 0, heroesSet: 0, skippedExisting: 0, failed: 0, noPhotosFound: 0 };
  }

  const speciesIds = locationSpecies.map((ls) => ls.species_id);

  // Fetch species details in batches (Supabase .in() limit ~200)
  const speciesList: SpeciesForPhotos[] = [];
  for (let i = 0; i < speciesIds.length; i += 200) {
    const batch = speciesIds.slice(i, i + 200);
    const { data, error } = await supabase
      .from("species")
      .select("id, scientific_name, name, slug, inat_taxon_id, hero_image_url")
      .in("id", batch);
    if (error) {
      console.error(`[Photo Pipeline] Failed to fetch species batch ${i}:`, error);
    } else if (data) {
      speciesList.push(...(data as SpeciesForPhotos[]));
    }
  }

  if (speciesList.length === 0) {
    console.error("[Photo Pipeline] No species found");
    return { totalSpecies: 0, photosDownloaded: 0, heroesSet: 0, skippedExisting: 0, failed: 0, noPhotosFound: 0 };
  }

  // Apply batch slicing
  let workList = speciesList;
  if (batchOffset > 0) {
    workList = workList.slice(batchOffset);
  }
  if (batchSize > 0) {
    workList = workList.slice(0, batchSize);
  }

  console.log(`[Photo Pipeline] Found ${speciesList.length} species at ${location.name}`);
  if (batchSize > 0 || batchOffset > 0) {
    console.log(`[Photo Pipeline] Batch: offset=${batchOffset}, size=${batchSize || "all"}, processing ${workList.length} species`);
  }
  console.log(`[Photo Pipeline] Max photos per species: ${maxPhotosPerSpecies}`);

  const result: PhotoPipelineResult = {
    totalSpecies: workList.length,
    photosDownloaded: 0,
    heroesSet: 0,
    skippedExisting: 0,
    failed: 0,
    noPhotosFound: 0,
  };

  let consecutive429s = 0;

  for (let i = 0; i < workList.length; i++) {
    const species = workList[i] as SpeciesForPhotos;

    if ((i + 1) % 25 === 0 || i === 0) {
      console.log(`\n[Photo Pipeline] Progress: ${i + 1}/${workList.length} (uploaded=${result.photosDownloaded}, heroes=${result.heroesSet}, skipped=${result.skippedExisting})`);
    }

    // Skip if already has a hero image
    if (skipExistingHeroes && species.hero_image_url) {
      result.skippedExisting++;
      continue;
    }

    // Global cooldown: if we've hit multiple 429s in a row, back off significantly
    if (consecutive429s >= 3) {
      const cooldown = Math.min(120000, 30000 * consecutive429s); // 90s, 120s, 120s...
      console.log(`[Photo Pipeline] Global cooldown: ${cooldown / 1000}s after ${consecutive429s} consecutive 429s`);
      await sleep(cooldown);
      consecutive429s = 0;
    }

    // Standard delay between species (3s to be respectful)
    if (i > 0) await sleep(3000);

    try {
      const photosAdded = await processSpeciesPhotos(
        supabase,
        species,
        location,
        maxPhotosPerSpecies
      );

      if (photosAdded > 0) {
        result.photosDownloaded += photosAdded;
        result.heroesSet++;
        consecutive429s = 0; // Reset on success
      } else {
        result.noPhotosFound++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429")) {
        consecutive429s++;
      }
      console.error(`[Photo Pipeline] Error for ${species.scientific_name}: ${msg}`);
      result.failed++;
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`[Photo Pipeline] Complete for ${location.name}`);
  console.log(`  Total species: ${result.totalSpecies}`);
  console.log(`  Photos downloaded: ${result.photosDownloaded}`);
  console.log(`  Heroes set: ${result.heroesSet}`);
  console.log(`  Skipped (existing hero): ${result.skippedExisting}`);
  console.log(`  No photos found: ${result.noPhotosFound}`);
  console.log(`  Failed: ${result.failed}`);
  console.log(`${"=".repeat(60)}\n`);

  return result;
}

/**
 * Process photos for a single species:
 * 1. Search Wikimedia by scientific name → common name fallback
 * 2. If nothing, try iNaturalist
 * 3. Download best photos, upload to Supabase Storage
 * 4. Insert audit records into photos table
 * 5. Set hero image on species
 */
async function processSpeciesPhotos(
  supabase: SupabaseClient,
  species: SpeciesForPhotos,
  location: { lat: number; lng: number; radius_km: number },
  maxPhotos: number
): Promise<number> {
  const commonName = species.name !== species.scientific_name ? species.name : null;
  let photosAdded = 0;

  // Step 1: Try Wikimedia Commons
  const wikiResult = await searchWikimediaPhotos(
    species.scientific_name,
    commonName,
    maxPhotos
  );

  if (wikiResult.photos.length > 0) {
    for (let j = 0; j < Math.min(wikiResult.photos.length, maxPhotos); j++) {
      if (j > 0) await sleep(2000); // Delay between downloads to avoid Wikimedia CDN 429
      const photo = wikiResult.photos[j];
      const isHero = j === 0;
      const filename = isHero ? "hero" : `photo-${j}`;

      const uploaded = await downloadAndUpload(
        supabase,
        species,
        photo.thumbUrl, // Use 1200px thumbnail for reasonable file sizes
        filename
      );

      if (uploaded) {
        await insertPhotoRecord(supabase, species, {
          url: uploaded.publicUrl,
          photographerName: photo.photographer,
          license: photo.license,
          licenseUrl: photo.licenseUrl,
          source: "wikimedia",
          sourceUrl: photo.sourceUrl,
          isHero,
          width: photo.width,
          height: photo.height,
        });

        if (isHero) {
          await setHeroImage(supabase, species.id, uploaded.publicUrl);
        }
        photosAdded++;
      }
    }

    return photosAdded;
  }

  // Step 2: Fallback to iNaturalist
  if (species.inat_taxon_id) {
    const inatResult = await searchINatPhotos(
      species.inat_taxon_id,
      location.lat,
      location.lng,
      Number(location.radius_km)
    );

    if (inatResult.photos.length > 0) {
      for (let j = 0; j < Math.min(inatResult.photos.length, maxPhotos); j++) {
        const photo = inatResult.photos[j];
        const isHero = j === 0;
        const filename = isHero ? "hero" : `photo-${j}`;

        const uploaded = await downloadAndUpload(
          supabase,
          species,
          photo.url,
          filename
        );

        if (uploaded) {
          await insertPhotoRecord(supabase, species, {
            url: uploaded.publicUrl,
            photographerName: photo.observerName,
            license: photo.license,
            licenseUrl: "",
            source: "inaturalist",
            sourceUrl: photo.sourceUrl,
            isHero,
            width: photo.width,
            height: photo.height,
            inatObservationId: photo.observationId,
          });

          if (isHero) {
            await setHeroImage(supabase, species.id, uploaded.publicUrl);
          }
          photosAdded++;
        }
      }
    }
  }

  if (photosAdded === 0) {
    console.log(`[Photo Pipeline] No photos found for ${species.scientific_name}`);
  }

  return photosAdded;
}

/**
 * Download an image from a URL and upload to Cloudflare R2.
 */
async function downloadAndUpload(
  _supabase: SupabaseClient,
  species: SpeciesForPhotos,
  imageUrl: string,
  filename: string
): Promise<{ publicUrl: string; storagePath: string } | null> {
  // Download image — single retry on 429, then give up (global cooldown handles sustained limits)
  let imageResponse: Response;
  try {
    imageResponse = await fetch(imageUrl, {
      headers: { "User-Agent": "SaltSafari/1.0 (https://saltsafari.app; hello@saltsafari.app)" },
    });

    if (imageResponse.status === 429) {
      console.log(`[Photo Pipeline] 429 on download, waiting 10s then retrying`);
      await sleep(10000);
      imageResponse = await fetch(imageUrl, {
        headers: { "User-Agent": "SaltSafari/1.0 (https://saltsafari.app; hello@saltsafari.app)" },
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Photo Pipeline] Download failed for ${species.scientific_name}: ${msg}`);
    return null;
  }

  if (!imageResponse.ok) {
    if (imageResponse.status === 429) {
      throw new Error("429 rate limited");
    }
    console.error(`[Photo Pipeline] Download HTTP ${imageResponse.status} for ${imageUrl}`);
    return null;
  }

  const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";
  const ext = getExtension(imageUrl);
  const storagePath = `${species.slug}/${filename}.${ext}`;

  const imageBuffer = await imageResponse.arrayBuffer();

  // Upload to Cloudflare R2
  try {
    const publicUrl = await uploadToR2(storagePath, imageBuffer, contentType);
    console.log(`[Photo Pipeline] Uploaded: ${storagePath}`);
    return { publicUrl, storagePath };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Photo Pipeline] R2 upload failed for ${storagePath}: ${msg}`);
    return null;
  }
}

/**
 * Insert a photo record with full audit trail.
 */
async function insertPhotoRecord(
  supabase: SupabaseClient,
  species: SpeciesForPhotos,
  photo: {
    url: string;
    photographerName: string;
    license: string;
    licenseUrl: string;
    source: "wikimedia" | "inaturalist";
    sourceUrl: string;
    isHero: boolean;
    width: number | null;
    height: number | null;
    inatObservationId?: number;
  }
): Promise<void> {
  const { error } = await supabase.from("photos").insert({
    url: photo.url,
    alt_text: `${species.name} (${species.scientific_name})`,
    photographer_name: photo.photographerName,
    license: photo.license,
    license_url: photo.licenseUrl || null,
    source: photo.source,
    source_url: photo.sourceUrl,
    date_accessed: new Date().toISOString().split("T")[0], // YYYY-MM-DD
    inaturalist_obs_id: photo.inatObservationId ?? null,
    species_id: species.id,
    is_hero: photo.isHero,
    width: photo.width,
    height: photo.height,
  });

  if (error) {
    console.error(`[Photo Pipeline] DB insert failed for ${species.scientific_name}: ${error.message}`);
  }
}

/**
 * Update species.hero_image_url.
 */
async function setHeroImage(
  supabase: SupabaseClient,
  speciesId: string,
  publicUrl: string
): Promise<void> {
  const { error } = await supabase
    .from("species")
    .update({ hero_image_url: publicUrl })
    .eq("id", speciesId);

  if (error) {
    console.error(`[Photo Pipeline] Failed to set hero_image_url: ${error.message}`);
  }
}
