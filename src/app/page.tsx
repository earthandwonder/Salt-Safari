import { createClient } from "@/lib/supabase/server";
import { HomePageClient } from "./HomePageClient";

export const revalidate = 3600; // ISR: revalidate every hour

type InSeasonSpecies = {
  speciesId: string;
  slug: string;
  commonName: string;
  scientificName: string | null;
  heroImageUrl: string | null;
  locationName: string;
  regionSlug: string;
  siteSlug: string;
  isCharismatic: boolean;
  isSeasonal: boolean; // active ≤8 months
  activeMonths: number;
  monthRange: string;
};

type RegionWithCounts = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  heroImageUrl: string | null;
  locationCount: number;
};

/**
 * Deterministic daily shuffle — same order all day, different tomorrow.
 * Preserves CDN/ISR caching.
 */
function dailySeedShuffle<T>(items: T[]): T[] {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const arr = [...items];

  // Simple seeded PRNG (mulberry32)
  let t = seed;
  function rand() {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  }

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatMonthRange(activeMonthNumbers: number[]): string {
  if (activeMonthNumbers.length === 0) return "Year-round";
  if (activeMonthNumbers.length >= 9) return "Year-round";

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const sorted = [...activeMonthNumbers].sort((a, b) => a - b);
  return `${monthNames[sorted[0] - 1]} — ${monthNames[sorted[sorted.length - 1] - 1]}`;
}

export default async function HomePage() {
  const supabase = await createClient();
  const currentMonth = new Date().getMonth() + 1; // 1-indexed

  // --- Parallel data fetches ---
  const [
    { count: speciesCount },
    { count: locationCount },
    { count: regionCount },
    { data: regions },
    { data: seasonalityData },
  ] = await Promise.all([
    supabase.from("species").select("*", { count: "exact", head: true }).eq("published", true),
    supabase.from("locations").select("*", { count: "exact", head: true }).eq("published", true),
    supabase.from("regions").select("*", { count: "exact", head: true }).eq("published", true),
    // Regions with location counts
    supabase
      .from("regions")
      .select("id, name, slug, description, hero_image_url")
      .eq("published", true)
      .order("name"),
    // Species in season this month (common or occasional)
    supabase
      .from("species_seasonality")
      .select(`
        month,
        likelihood,
        location_species_id,
        location_species:location_species_id (
          id,
          species_id,
          location_id,
          confidence,
          total_observations,
          species:species_id (
            id, name, scientific_name, slug, hero_image_url, is_charismatic
          ),
          location:location_id (
            id, name, slug, region_id,
            region:region_id ( slug )
          )
        )
      `)
      .eq("month", currentMonth)
      .in("likelihood", ["common", "occasional"]),
  ]);

  // --- Fetch location counts per region ---
  const regionIds = (regions ?? []).map((r) => r.id);
  const regionWithCounts: RegionWithCounts[] = [];

  if (regionIds.length > 0) {
    const { data: locationRows } = await supabase
      .from("locations")
      .select("id, region_id")
      .eq("published", true)
      .in("region_id", regionIds);

    const countByRegion: Record<string, number> = {};
    for (const loc of locationRows ?? []) {
      countByRegion[loc.region_id] = (countByRegion[loc.region_id] ?? 0) + 1;
    }

    for (const region of regions ?? []) {
      regionWithCounts.push({
        id: region.id,
        name: region.name,
        slug: region.slug,
        description: region.description,
        heroImageUrl: region.hero_image_url,
        locationCount: countByRegion[region.id] ?? 0,
      });
    }
  }

  // --- Build In Season species list with priority fill ---
  // First, collect all location_species IDs from this month's seasonality to get active month counts
  const locationSpeciesIds = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (seasonalityData ?? []) as any[]) {
    if (row.location_species_id) {
      locationSpeciesIds.add(row.location_species_id);
    }
  }

  // Get active month counts for each location_species (how many months they're common/occasional)
  const activeMonthCounts: Record<string, number[]> = {};
  if (locationSpeciesIds.size > 0) {
    const lsIdArray = Array.from(locationSpeciesIds);
    // Batch in groups of 200
    for (let i = 0; i < lsIdArray.length; i += 200) {
      const batch = lsIdArray.slice(i, i + 200);
      const { data: allMonths } = await supabase
        .from("species_seasonality")
        .select("location_species_id, month, likelihood")
        .in("location_species_id", batch)
        .in("likelihood", ["common", "occasional"]);

      for (const m of allMonths ?? []) {
        if (!activeMonthCounts[m.location_species_id]) {
          activeMonthCounts[m.location_species_id] = [];
        }
        activeMonthCounts[m.location_species_id].push(m.month);
      }
    }
  }

  // Build the In Season list
  const inSeasonSpecies: InSeasonSpecies[] = [];
  const seenSpeciesIds = new Set<string>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (seasonalityData ?? []) as any[]) {
    const ls = row.location_species;
    if (!ls) continue;

    const species = ls.species;
    const location = ls.location;
    if (!species || !location || !species.slug) continue;
    if (!species.hero_image_url) continue; // Skip species without photos for homepage cards

    // Deduplicate by species ID — show each species only once (at its best location)
    if (seenSpeciesIds.has(species.id)) continue;
    seenSpeciesIds.add(species.id);

    const activeMonths = activeMonthCounts[ls.id] ?? [];
    const isSeasonal = activeMonths.length > 0 && activeMonths.length <= 8;

    inSeasonSpecies.push({
      speciesId: species.id,
      slug: species.slug,
      commonName: species.name,
      scientificName: species.scientific_name,
      heroImageUrl: species.hero_image_url,
      locationName: location.name,
      regionSlug: location.region?.slug ?? "",
      siteSlug: location.slug,
      isCharismatic: species.is_charismatic ?? false,
      isSeasonal,
      activeMonths: activeMonths.length,
      monthRange: formatMonthRange(activeMonths),
    });
  }

  // Priority sort: (1) seasonal + charismatic, (2) seasonal, (3) charismatic year-round backfill
  const tier1 = inSeasonSpecies.filter((s) => s.isSeasonal && s.isCharismatic);
  const tier2 = inSeasonSpecies.filter((s) => s.isSeasonal && !s.isCharismatic);
  const tier3 = inSeasonSpecies.filter((s) => !s.isSeasonal && s.isCharismatic);

  const sorted = [
    ...dailySeedShuffle(tier1),
    ...dailySeedShuffle(tier2),
    ...dailySeedShuffle(tier3),
  ].slice(0, 8); // Cap at 8 for the homepage row

  return (
    <HomePageClient
      speciesCount={speciesCount ?? 0}
      locationCount={locationCount ?? 0}
      regionCount={regionCount ?? 0}
      inSeasonSpecies={sorted}
      regions={regionWithCounts}
    />
  );
}
