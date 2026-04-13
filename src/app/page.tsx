import { createClient } from "@/lib/supabase/server";
import { HomePageClient } from "./HomePageClient";

export const dynamic = "force-dynamic"; // needs auth check per request

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
    .select("id, name, slug, region_id")
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
      />
    );
  }

  // --- Parallel data fetches scoped to Cabbage Tree Bay ---
  const [
    { data: locationSpeciesData },
    { data: seasonalityData },
  ] = await Promise.all([
    // All species at this location (published only, matching location page)
    supabase
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
      .eq("species.published", true),

    // Species in season this month
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
          species:species_id (
            id, name, scientific_name, slug, hero_image_url, is_charismatic
          )
        )
      `)
      .eq("month", currentMonth)
      .in("likelihood", ["common", "occasional"]),
  ]);

  // --- Species counts at CTB ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allLS = (locationSpeciesData ?? []) as any[];
  const speciesCount = allLS.length;
  const spottableCount = allLS.filter((ls) => ls.is_spottable).length;

  // --- Filter seasonality to CTB only ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctbSeasonality = (seasonalityData ?? []).filter((row: any) => {
    return row.location_species?.location_id === ctbLocation.id;
  });

  // --- Get active month counts for in-season species ---
  const locationSpeciesIds = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of ctbSeasonality as any[]) {
    if (row.location_species_id) {
      locationSpeciesIds.add(row.location_species_id);
    }
  }

  const activeMonthCounts: Record<string, number[]> = {};
  if (locationSpeciesIds.size > 0) {
    const lsIdArray = Array.from(locationSpeciesIds);
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

  // --- Build In Season species list ---
  const inSeasonSpecies: InSeasonSpecies[] = [];
  const seenSpeciesIds = new Set<string>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of ctbSeasonality as any[]) {
    const ls = row.location_species;
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

  // --- Check if user is logged in and fetch their sighting data ---
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  let userSpottedSpeciesIds: Set<string> = new Set();
  let userSpottedCount = 0;
  let userLatestLog: { speciesCount: number; locationName: string; date: string; speciesImages: string[] } | null = null;

  if (user) {
    // Fetch all distinct species the user has spotted at CTB
    const { data: userSightings } = await supabase
      .from("sightings")
      .select("species_id, sighted_at, location_id, species:species_id (hero_image_url), locations:location_id (name)")
      .eq("user_id", user.id)
      .eq("location_id", ctbLocation.id)
      .order("sighted_at", { ascending: false });

    if (userSightings && userSightings.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sightings = userSightings as any[];
      // Distinct species spotted at CTB
      for (const s of sightings) {
        userSpottedSpeciesIds.add(s.species_id);
      }
      userSpottedCount = userSpottedSpeciesIds.size;

      // Latest log date — group sightings by date to find the most recent "session"
      const latestDate = sightings[0].sighted_at;
      const latestSession = sightings.filter((s) => s.sighted_at === latestDate);
      const latestSpeciesImages = latestSession
        .map((s) => s.species?.hero_image_url)
        .filter((url: string | null): url is string => !!url);
      const locationName = latestSession[0].locations?.name ?? "Cabbage Tree Bay";

      userLatestLog = {
        speciesCount: latestSession.length,
        locationName,
        date: latestDate,
        speciesImages: latestSpeciesImages,
      };
    }
  }

  // --- Build collection preview species (12 spottable species, some "revealed") ---
  const spottableSpecies = allLS.filter(
    (ls) => ls.is_spottable && ls.species?.hero_image_url
  );

  let collectionPreview;
  if (isLoggedIn && userSpottedSpeciesIds.size > 0) {
    // Put the user's spotted species first, then fill remaining slots with unspotted
    const spotted = spottableSpecies.filter((ls) => userSpottedSpeciesIds.has(ls.species.id));
    const unspotted = spottableSpecies.filter((ls) => !userSpottedSpeciesIds.has(ls.species.id));
    const shuffledSpotted = dailySeedShuffle(spotted);
    const shuffledUnspotted = dailySeedShuffle(unspotted);
    collectionPreview = [...shuffledSpotted, ...shuffledUnspotted].slice(0, 12);
  } else {
    const shuffledForCollection = dailySeedShuffle(spottableSpecies);
    collectionPreview = shuffledForCollection.slice(0, 12);
  }

  const collectionPreviewSpecies: CollectionPreviewSpecies[] =
    collectionPreview.map((ls, index) => ({
      id: ls.species.id,
      commonName: ls.species.name,
      heroImageUrl: ls.species.hero_image_url,
      revealed: isLoggedIn
        ? userSpottedSpeciesIds.has(ls.species.id)
        : index < 4,
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
      userSpottedCount={userSpottedCount}
      userLatestLog={userLatestLog}
      isLoggedIn={isLoggedIn}
    />
  );
}
