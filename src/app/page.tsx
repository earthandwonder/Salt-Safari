import { createClient } from "@/lib/supabase/server";
import { HomePageClient } from "./HomePageClient";

export const revalidate = 3600; // ISR — public data only, auth moved to client

type InSeasonSpecies = {
  speciesId: string;
  slug: string;
  commonName: string;
  scientificName: string | null;
  heroImageUrl: string | null;
  isSeasonal: boolean;
  activeMonths: number;
  monthRange: string;
};

type CollectionPreviewSpecies = {
  id: string;
  commonName: string;
  heroImageUrl: string | null;
  revealed: boolean;
};

type DiscoverSpecies = {
  id: string;
  slug: string;
  commonName: string;
  scientificName: string | null;
  heroImageUrl: string | null;
};

/**
 * Deterministic daily shuffle — same order all day, different tomorrow.
 * Preserves CDN/ISR caching.
 */
function dailySeedShuffle<T>(items: T[]): T[] {
  const today = new Date();
  const seed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();
  const arr = [...items];

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

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const sorted = [...activeMonthNumbers].sort((a, b) => a - b);
  return `${monthNames[sorted[0] - 1]} — ${monthNames[sorted[sorted.length - 1] - 1]}`;
}

// Cabbage Tree Bay location slug — the MVP focus
const CTB_SLUG = "cabbage-tree-bay";

export default async function HomePage() {
  const supabase = await createClient();
  const currentMonth = new Date().getMonth() + 1;

  // --- Get Cabbage Tree Bay location ---
  const { data: ctbLocation } = await supabase
    .from("locations")
    .select("id, name, slug, region_id, hero_image_url, lat, lng")
    .eq("slug", CTB_SLUG)
    .single();

  if (!ctbLocation) {
    // Fallback if CTB isn't seeded yet — show minimal page
    return (
      <HomePageClient
        speciesCount={0}
        spottableCount={0}
        inSeasonCount={0}
        inSeasonSpecies={[]}
        collectionPreviewSpecies={[]}
        discoverSpecies={[]}
        ctbLocationId=""
      />
    );
  }

  // --- Fetch all location_species for CTB (paginated, matching location page) ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allLocationSpeciesRaw: any[] = [];
  {
    let from = 0;
    const pageSize = 500;
    let hasMore = true;
    while (hasMore) {
      const { data: batch } = await supabase
        .from("location_species")
        .select(`
          id,
          species_id,
          is_spottable,
          confidence,
          total_observations,
          species:species_id!inner (
            id, name, scientific_name, slug, hero_image_url, is_charismatic, published
          )
        `)
        .eq("location_id", ctbLocation.id)
        .eq("species.published", true)
        .range(from, from + pageSize - 1)
        .order("total_observations", { ascending: false });

      if (!batch || batch.length === 0) {
        hasMore = false;
      } else {
        allLocationSpeciesRaw.push(...batch);
        from += pageSize;
        if (batch.length < pageSize) hasMore = false;
      }
    }
  }

  // --- Species counts at CTB ---
  // Deduplicate by species_id (keep row with most observations), matching location page logic
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dedupedMap = new Map<string, any>();
  for (const ls of allLocationSpeciesRaw) {
    const existing = dedupedMap.get(ls.species_id);
    if (!existing || (ls.total_observations ?? 0) > (existing.total_observations ?? 0)) {
      dedupedMap.set(ls.species_id, ls);
    }
  }
  const allLS = Array.from(dedupedMap.values());
  const speciesCount = allLS.length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spottableCount = allLS.filter((ls: any) => ls.is_spottable).length;

  // --- Scoped seasonality + active month counts (parallelized) ---
  const ctbLocationSpeciesIds = allLocationSpeciesRaw.map((ls) => ls.id as string);

  // Fetch current-month seasonality scoped to CTB location_species IDs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seasonalityBatches: PromiseLike<{ data: { location_species_id: string; month: number; likelihood: string }[] | null }>[] = [];
  for (let i = 0; i < ctbLocationSpeciesIds.length; i += 200) {
    seasonalityBatches.push(
      supabase
        .from("species_seasonality")
        .select("location_species_id, month, likelihood")
        .in("location_species_id", ctbLocationSpeciesIds.slice(i, i + 200))
        .eq("month", currentMonth)
        .in("likelihood", ["common", "occasional"])
    );
  }

  // Fetch ALL active months for those same IDs (needed for month range computation)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeMonthBatches: PromiseLike<{ data: { location_species_id: string; month: number; likelihood: string }[] | null }>[] = [];
  for (let i = 0; i < ctbLocationSpeciesIds.length; i += 200) {
    activeMonthBatches.push(
      supabase
        .from("species_seasonality")
        .select("location_species_id, month, likelihood")
        .in("location_species_id", ctbLocationSpeciesIds.slice(i, i + 200))
        .in("likelihood", ["common", "occasional"])
    );
  }

  // Run both sets of batches in parallel
  const [seasonalityResults, activeMonthResults] = await Promise.all([
    Promise.all(seasonalityBatches),
    Promise.all(activeMonthBatches),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctbSeasonality = seasonalityResults.flatMap((r) => r.data ?? []) as any[];

  const activeMonthCounts: Record<string, number[]> = {};
  for (const r of activeMonthResults) {
    for (const m of r.data ?? []) {
      if (!activeMonthCounts[m.location_species_id]) {
        activeMonthCounts[m.location_species_id] = [];
      }
      activeMonthCounts[m.location_species_id].push(m.month);
    }
  }

  // --- Build In Season species list ---
  // Build a lookup from location_species_id to species data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lsById = new Map<string, any>();
  for (const ls of allLocationSpeciesRaw) {
    lsById.set(ls.id, ls);
  }

  const inSeasonSpecies: InSeasonSpecies[] = [];
  const seenSpeciesIds = new Set<string>();

  for (const row of ctbSeasonality) {
    const ls = lsById.get(row.location_species_id);
    if (!ls) continue;

    const species = ls.species;
    if (!species || !species.slug) continue;
    if (!species.hero_image_url) continue;

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
      isSeasonal,
      activeMonths: activeMonths.length,
      monthRange: formatMonthRange(activeMonths),
    });
  }

  // Priority sort
  const tier1 = inSeasonSpecies.filter(
    (s) => s.isSeasonal
  );
  const tier2 = inSeasonSpecies.filter(
    (s) => !s.isSeasonal
  );

  const sortedInSeason = [
    ...dailySeedShuffle(tier1),
    ...dailySeedShuffle(tier2),
  ].slice(0, 8);

  // --- Build Discover Species list (3 random spottable species with photos) ---
  const spottableWithPhotos = allLS.filter(
    (ls) => ls.is_spottable && ls.species?.hero_image_url && ls.species?.slug
  );
  const discoverSpecies: DiscoverSpecies[] = dailySeedShuffle(spottableWithPhotos)
    .slice(0, 3)
    .map((ls) => ({
      id: ls.species.id,
      slug: ls.species.slug,
      commonName: ls.species.name,
      scientificName: ls.species.scientific_name,
      heroImageUrl: ls.species.hero_image_url,
    }));

  // --- Build collection preview species (12 spottable species, some "revealed") ---
  const spottableSpecies = allLS.filter(
    (ls) => ls.is_spottable && ls.species?.hero_image_url
  );

  const shuffledForCollection = dailySeedShuffle(spottableSpecies);
  const collectionPreview = shuffledForCollection.slice(0, 12);

  const collectionPreviewSpecies: CollectionPreviewSpecies[] =
    collectionPreview.map((ls, index) => ({
      id: ls.species.id,
      commonName: ls.species.name,
      heroImageUrl: ls.species.hero_image_url,
      revealed: index < 4,
    }));

  // Pad with placeholders if we don't have 12 species yet
  while (collectionPreviewSpecies.length < 12) {
    collectionPreviewSpecies.push({
      id: `placeholder-${collectionPreviewSpecies.length}`,
      commonName: "Unknown",
      heroImageUrl: null,
      revealed: false,
    });
  }

  return (
    <HomePageClient
      speciesCount={speciesCount}
      spottableCount={spottableCount}
      inSeasonCount={inSeasonSpecies.length}
      inSeasonSpecies={sortedInSeason}
      collectionPreviewSpecies={collectionPreviewSpecies}
      discoverSpecies={discoverSpecies}
      ctbLocationId={ctbLocation.id}
      heroImageUrl={ctbLocation.hero_image_url}
      locationLat={ctbLocation.lat}
      locationLng={ctbLocation.lng}
    />
  );
}
