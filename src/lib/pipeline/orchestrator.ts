// Multi-source species data pipeline orchestrator
// Queries iNaturalist, ALA, OBIS → deduplicates via WoRMS → writes to Supabase

import type { SupabaseClient } from "@supabase/supabase-js";
import type { RawSpeciesRecord, SeasonalityData, PipelineSource } from "./types";
import { queryINaturalistSpecies, queryINaturalistSeasonality } from "./inaturalist";
import { queryALASpecies } from "./ala";
import { queryOBISSpecies } from "./obis";
import { resolveToWoRMS, getWoRMSRecord, getWoRMSVernaculars, clearWoRMSCache } from "./worms";
import type { WoRMSRecord } from "./worms";

// --- Types ---

type MergedSpecies = {
  scientificName: string;
  commonName: string | null;
  aphiaId: number | null;
  inatTaxonId: number | null;
  taxonomy: {
    kingdom: string | null;
    phylum: string | null;
    class: string | null;
    order: string | null;
    family: string | null;
    genus: string | null;
  };
  sources: {
    source: PipelineSource;
    observationCount: number;
  }[];
  totalObservations: number;
  isEndemic: boolean | null;
  isNative: boolean | null;
  isIntroduced: boolean | null;
  confidence: number;
};

// --- Helpers ---

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeScientificName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Filter junk records from ALA (and any source):
 * - "Not supplied" or empty names
 * - Genus-only names (no space = no species epithet)
 */
function isValidSpeciesRecord(record: RawSpeciesRecord): boolean {
  const name = record.scientificName?.trim();
  if (!name) return false;
  if (name === "Not supplied" || name === "not supplied") return false;
  if (!name.includes(" ")) return false; // genus-only
  return true;
}

// --- Confidence scoring ---

const SOURCE_WEIGHTS: Record<PipelineSource, number> = {
  ala: 1.0,
  obis: 0.8,
  inaturalist: 0.7,
  gbif: 0.5,
  manual: 0.3,
};

function corroborationFactor(sourceCount: number): number {
  if (sourceCount >= 3) return 1.0;
  if (sourceCount === 2) return 0.8;
  return 0.6;
}

function calculateConfidence(
  sources: { source: PipelineSource; observationCount: number }[]
): number {
  // Weighted average of source scores (each source score = source_weight * log-scaled obs count)
  let weightedSum = 0;
  let totalWeight = 0;

  for (const s of sources) {
    const w = SOURCE_WEIGHTS[s.source] ?? 0.5;
    // Log-scaled observation count: log10(count + 1) / log10(1000), capped at 1.0
    const obsScore = Math.min(1.0, Math.log10(s.observationCount + 1) / Math.log10(1000));
    weightedSum += w * obsScore;
    totalWeight += w;
  }

  const avgScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const corroboration = corroborationFactor(sources.length);
  return Math.round(avgScore * corroboration * 1000) / 1000; // 3 decimal places
}

// --- Main orchestrator ---

export async function runPipelineForLocation(
  locationSlug: string,
  supabase: SupabaseClient
): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`[Pipeline] Starting for location: ${locationSlug}`);
  console.log(`${"=".repeat(60)}\n`);

  clearWoRMSCache();

  // Step 1: Fetch location from database
  const { data: location, error: locError } = await supabase
    .from("locations")
    .select("id, name, slug, lat, lng, radius_km")
    .eq("slug", locationSlug)
    .single();

  if (locError || !location) {
    console.error(`[Pipeline] Location not found: ${locationSlug}`, locError);
    return;
  }

  if (!location.lat || !location.lng) {
    console.error(`[Pipeline] Location ${locationSlug} has no coordinates`);
    return;
  }

  const query = {
    lat: location.lat,
    lng: location.lng,
    radiusKm: Number(location.radius_km),
  };

  console.log(`[Pipeline] Location: ${location.name} (${query.lat}, ${query.lng}, r=${query.radiusKm}km)`);

  // Step 2: Query all three sources in parallel
  console.log(`\n[Pipeline] Querying all sources in parallel...`);
  const [inatResult, alaResult, obisResult] = await Promise.all([
    queryINaturalistSpecies(query),
    queryALASpecies(query),
    queryOBISSpecies(query),
  ]);

  console.log(`\n[Pipeline] Source results:`);
  console.log(`  iNaturalist: ${inatResult.species.length} species, ${inatResult.errors.length} errors`);
  console.log(`  ALA: ${alaResult.species.length} species, ${alaResult.errors.length} errors`);
  console.log(`  OBIS: ${obisResult.species.length} species, ${obisResult.errors.length} errors`);

  // Step 3: Filter junk records
  const allRecords = [
    ...inatResult.species,
    ...alaResult.species,
    ...obisResult.species,
  ].filter(isValidSpeciesRecord);

  console.log(`[Pipeline] Total valid records after filtering: ${allRecords.length}`);

  // Step 4: Deduplicate by normalised scientific name
  const speciesMap = new Map<string, RawSpeciesRecord[]>();
  for (const record of allRecords) {
    const key = normalizeScientificName(record.scientificName);
    if (!speciesMap.has(key)) {
      speciesMap.set(key, []);
    }
    speciesMap.get(key)!.push(record);
  }

  console.log(`[Pipeline] Unique species (by name): ${speciesMap.size}`);

  // Step 5 & 6: Resolve WoRMS AphiaIDs and merge records
  console.log(`\n[Pipeline] Resolving WoRMS taxonomy...`);

  // Build a map of known OBIS AphiaIDs for quick lookup
  const obisAphiaMap = new Map<string, number>();
  for (const record of obisResult.species) {
    if (record.wormsAphiaId) {
      obisAphiaMap.set(normalizeScientificName(record.scientificName), record.wormsAphiaId);
    }
  }

  const mergedSpecies: MergedSpecies[] = [];
  let resolvedCount = 0;
  let cachedFromObis = 0;
  let failedCount = 0;

  for (const [normalizedName, records] of speciesMap) {
    const primaryRecord = records[0]; // use first record for base info

    // Check if OBIS already has an AphiaID for this species
    let aphiaId = obisAphiaMap.get(normalizedName) ?? null;

    if (aphiaId) {
      cachedFromObis++;
    } else {
      // Also check if any record has an AphiaID
      for (const r of records) {
        if (r.wormsAphiaId) {
          aphiaId = r.wormsAphiaId;
          break;
        }
      }
    }

    // If still no AphiaID, resolve via WoRMS API
    if (!aphiaId) {
      aphiaId = await resolveToWoRMS(primaryRecord.scientificName);
      if (aphiaId) {
        resolvedCount++;
      } else {
        failedCount++;
      }
    }

    // Get taxonomy — use OBIS taxonomy directly when available (it's from WoRMS anyway),
    // only call WoRMS API for species that need it (resolved via API or no OBIS record)
    let taxonomy = {
      kingdom: null as string | null,
      phylum: null as string | null,
      class: null as string | null,
      order: null as string | null,
      family: null as string | null,
      genus: null as string | null,
    };

    // First, try OBIS taxonomy (already WoRMS-sourced)
    const obisRecord = records.find((r) => r.source === "obis" && r.kingdom);
    if (obisRecord) {
      taxonomy = {
        kingdom: obisRecord.kingdom,
        phylum: obisRecord.phylum,
        class: obisRecord.class,
        order: obisRecord.order,
        family: obisRecord.family,
        genus: obisRecord.genus,
      };
    }

    // If no OBIS taxonomy and we have an AphiaID, fetch from WoRMS API
    if (!taxonomy.kingdom && aphiaId) {
      const wormsRecord = await getWoRMSRecord(aphiaId);
      if (wormsRecord) {
        // Check if this is a terrestrial-only species — skip it
        if (wormsRecord.isTerrestrial && !wormsRecord.isMarine && !wormsRecord.isBrackish) {
          console.log(`[Pipeline] Skipping terrestrial species: ${primaryRecord.scientificName}`);
          continue;
        }

        taxonomy = {
          kingdom: wormsRecord.kingdom,
          phylum: wormsRecord.phylum,
          class: wormsRecord.class,
          order: wormsRecord.order,
          family: wormsRecord.family,
          genus: wormsRecord.genus,
        };

        // If unaccepted, use the valid AphiaID
        if (wormsRecord.validAphiaId && wormsRecord.status === "unaccepted") {
          aphiaId = wormsRecord.validAphiaId;
          const validRecord = await getWoRMSRecord(aphiaId);
          if (validRecord) {
            taxonomy = {
              kingdom: validRecord.kingdom,
              phylum: validRecord.phylum,
              class: validRecord.class,
              order: validRecord.order,
              family: validRecord.family,
              genus: validRecord.genus,
            };
          }
        }
      }
    }

    // Determine best common name
    let commonName: string | null = null;
    for (const r of records) {
      if (r.commonName) {
        commonName = r.commonName;
        break;
      }
    }
    // If no common name from any source, try WoRMS vernaculars
    if (!commonName && aphiaId) {
      commonName = await getWoRMSVernaculars(aphiaId);
    }

    // Merge sources
    const sources = records.map((r) => ({
      source: r.source,
      observationCount: r.observationCount,
    }));

    const totalObservations = sources.reduce((sum, s) => sum + s.observationCount, 0);

    // Merge flags (prefer non-null values)
    let isEndemic: boolean | null = null;
    let isNative: boolean | null = null;
    let isIntroduced: boolean | null = null;
    for (const r of records) {
      if (r.isEndemic !== null) isEndemic = r.isEndemic;
      if (r.isNative !== null) isNative = r.isNative;
      if (r.isIntroduced !== null) isIntroduced = r.isIntroduced;
    }

    const confidence = calculateConfidence(sources);

    // Get iNat taxon ID if available
    let inatTaxonId: number | null = null;
    for (const r of records) {
      if (r.inatTaxonId) {
        inatTaxonId = r.inatTaxonId;
        break;
      }
    }

    mergedSpecies.push({
      scientificName: primaryRecord.scientificName,
      commonName,
      aphiaId,
      inatTaxonId,
      taxonomy,
      sources,
      totalObservations,
      isEndemic,
      isNative,
      isIntroduced,
      confidence,
    });
  }

  // Post-merge: deduplicate by AphiaID (different scientific names → same AphiaID)
  const aphiaMap = new Map<number, MergedSpecies>();
  const finalSpecies: MergedSpecies[] = [];

  for (const sp of mergedSpecies) {
    if (sp.aphiaId && aphiaMap.has(sp.aphiaId)) {
      // Merge into existing
      const existing = aphiaMap.get(sp.aphiaId)!;
      existing.sources.push(...sp.sources);
      existing.totalObservations += sp.totalObservations;
      existing.confidence = calculateConfidence(existing.sources);
      if (!existing.commonName && sp.commonName) existing.commonName = sp.commonName;
      if (!existing.inatTaxonId && sp.inatTaxonId) existing.inatTaxonId = sp.inatTaxonId;
    } else {
      if (sp.aphiaId) aphiaMap.set(sp.aphiaId, sp);
      finalSpecies.push(sp);
    }
  }

  console.log(`\n[Pipeline] WoRMS resolution summary:`);
  console.log(`  From OBIS (cached): ${cachedFromObis}`);
  console.log(`  Resolved via API: ${resolvedCount}`);
  console.log(`  Failed (kept as partial): ${failedCount}`);
  console.log(`  Final species count: ${finalSpecies.length}`);

  // Step 8-10: Write to database
  console.log(`\n[Pipeline] Writing to database...`);
  let upsertedSpecies = 0;
  let upsertedLocationSpecies = 0;
  let insertedSourceRecords = 0;

  // Cache for location_species IDs (used later for seasonality)
  const locationSpeciesIdMap = new Map<string, string>(); // scientificName → location_species.id

  // Pre-generate slugs with deduplication
  const usedSlugs = new Set<string>();

  for (const sp of finalSpecies) {
    const displayName = sp.commonName || sp.scientificName;
    let speciesSlug = slugify(displayName);
    // If slug collision, append scientific name for uniqueness
    if (usedSlugs.has(speciesSlug)) {
      speciesSlug = slugify(sp.scientificName);
    }
    // If still colliding (shouldn't happen since scientific names are unique), add suffix
    if (usedSlugs.has(speciesSlug)) {
      let suffix = 2;
      while (usedSlugs.has(`${speciesSlug}-${suffix}`)) suffix++;
      speciesSlug = `${speciesSlug}-${suffix}`;
    }
    usedSlugs.add(speciesSlug);

    // Step 8: Upsert species
    const { data: speciesRow, error: speciesError } = await supabase
      .from("species")
      .upsert(
        {
          name: displayName,
          scientific_name: sp.scientificName,
          slug: speciesSlug,
          inat_taxon_id: sp.inatTaxonId,
          worms_aphia_id: sp.aphiaId,
          kingdom: sp.taxonomy.kingdom,
          phylum: sp.taxonomy.phylum,
          class: sp.taxonomy.class,
          order: sp.taxonomy.order,
          family: sp.taxonomy.family,
          genus: sp.taxonomy.genus,
          is_endemic: sp.isEndemic,
          is_native: sp.isNative,
          is_introduced: sp.isIntroduced,
          data_quality: sp.aphiaId ? "partial" : "stub",
        },
        { onConflict: "scientific_name" }
      )
      .select("id")
      .single();

    if (speciesError || !speciesRow) {
      console.error(`[Pipeline] Failed to upsert species "${sp.scientificName}":`, speciesError?.message);
      continue;
    }
    upsertedSpecies++;

    // Step 9: Upsert location_species
    const { data: lsRow, error: lsError } = await supabase
      .from("location_species")
      .upsert(
        {
          location_id: location.id,
          species_id: speciesRow.id,
          confidence: sp.confidence,
          total_observations: sp.totalObservations,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "location_id,species_id" }
      )
      .select("id")
      .single();

    if (lsError || !lsRow) {
      console.error(`[Pipeline] Failed to upsert location_species for "${sp.scientificName}":`, lsError?.message);
      continue;
    }
    upsertedLocationSpecies++;
    locationSpeciesIdMap.set(sp.scientificName, lsRow.id);

    // Step 10: Insert source_records for each source
    for (const src of sp.sources) {
      const { error: srcError } = await supabase
        .from("source_records")
        .upsert(
          {
            location_species_id: lsRow.id,
            source: src.source,
            observation_count: src.observationCount,
            last_queried: new Date().toISOString(),
          },
          { onConflict: "location_species_id,source,source_dataset" }
        );

      if (srcError) {
        console.error(`[Pipeline] Failed to insert source_record:`, srcError.message);
      } else {
        insertedSourceRecords++;
      }
    }
  }

  console.log(`\n[Pipeline] Database write summary:`);
  console.log(`  Species upserted: ${upsertedSpecies}`);
  console.log(`  Location_species upserted: ${upsertedLocationSpecies}`);
  console.log(`  Source_records inserted: ${insertedSourceRecords}`);

  // Step 11-13: Seasonality from iNaturalist
  console.log(`\n[Pipeline] Querying seasonality data from iNaturalist...`);

  // Only query seasonality for species that have iNat taxon IDs
  const speciesWithInat = finalSpecies.filter((sp) => sp.inatTaxonId);
  console.log(`[Pipeline] Species with iNat taxon IDs for seasonality: ${speciesWithInat.length}`);

  let seasonalityCount = 0;

  for (let i = 0; i < speciesWithInat.length; i++) {
    const sp = speciesWithInat[i];
    if ((i + 1) % 50 === 0 || i === 0) {
      console.log(`[Pipeline] Seasonality progress: ${i + 1}/${speciesWithInat.length}`);
    }

    const { data: seasonality, error: seasError } = await queryINaturalistSeasonality({
      lat: query.lat,
      lng: query.lng,
      radiusKm: query.radiusKm,
      taxonId: sp.inatTaxonId!,
    });

    if (seasError || seasonality.length === 0) continue;

    const totalObs = seasonality.reduce((sum, m) => sum + m.observationCount, 0);
    // Skip if too sparse (< 3 total observations)
    if (totalObs < 3) continue;

    const monthlyAvg = totalObs / 12;

    // Get the location_species_id from cache
    const lsId = locationSpeciesIdMap.get(sp.scientificName);
    if (!lsId) continue;

    // Step 12: Classify months
    const seasonalityRecords = seasonality.map((m: SeasonalityData) => {
      let likelihood: "common" | "occasional" | "rare";
      if (m.observationCount > monthlyAvg) {
        likelihood = "common";
      } else if (m.observationCount > 0) {
        likelihood = "occasional";
      } else {
        likelihood = "rare";
      }

      return {
        location_species_id: lsId,
        month: m.month,
        likelihood,
        raw_observation_count: m.observationCount,
        source: "inaturalist_data" as const,
        last_synced_at: new Date().toISOString(),
      };
    });

    // Step 13: Insert seasonality records
    const { error: seasonError } = await supabase
      .from("species_seasonality")
      .upsert(seasonalityRecords, {
        onConflict: "location_species_id,month",
      });

    if (seasonError) {
      console.error(`[Pipeline] Seasonality error for ${sp.scientificName}:`, seasonError.message);
    } else {
      seasonalityCount++;

      // Derive first/last observed months
      const observedMonths = seasonality
        .filter((m: SeasonalityData) => m.observationCount > 0)
        .map((m: SeasonalityData) => m.month);

      if (observedMonths.length > 0) {
        await supabase
          .from("location_species")
          .update({
            first_observed_month: Math.min(...observedMonths),
            last_observed_month: Math.max(...observedMonths),
          })
          .eq("id", lsId);
      }
    }
  }

  console.log(`[Pipeline] Seasonality written for ${seasonalityCount} species`);

  // Step 14: Update location metadata
  await supabase
    .from("locations")
    .update({
      last_synced_at: new Date().toISOString(),
      data_quality: "partial",
    })
    .eq("id", location.id);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`[Pipeline] Complete for ${location.name}`);
  console.log(`  Final species: ${finalSpecies.length}`);
  console.log(`  With WoRMS AphiaID: ${finalSpecies.filter((s) => s.aphiaId).length}`);
  console.log(`  With seasonality: ${seasonalityCount}`);
  console.log(`${"=".repeat(60)}\n`);
}
