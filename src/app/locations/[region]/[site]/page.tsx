import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Location, Region, Species, LocationSpecies, SpeciesSeasonality } from "@/types";
import { LocationPageClient } from "./LocationPageClient";

// ─── Types ───────────────────────────────────────────────────────
export type LocationSpeciesWithDetails = {
  species: Species;
  locationSpecies: LocationSpecies;
  /** Likelihood for the current month, or null if no seasonality data. */
  currentMonthLikelihood: "common" | "occasional" | "rare" | null;
  /** How many months this species is active (common or occasional). */
  activeMonthCount: number;
  /** Whether the species is "in season" right now (active ≤8 months AND current month is active). */
  isInSeason: boolean;
};

type NearbyLocation = {
  id: string;
  name: string;
  slug: string;
  hero_image_url: string | null;
  skill_level: Location["skill_level"];
  depth_min: number | null;
  depth_max: number | null;
  activities: string[];
  speciesCount: number;
  inSeasonCount: number;
};

// ─── Data fetching ───────────────────────────────────────────────
async function getLocationData(regionSlug: string, siteSlug: string) {
  const supabase = await createClient();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  // 1. Fetch region
  const { data: region } = await supabase
    .from("regions")
    .select("*")
    .eq("slug", regionSlug)
    .eq("published", true)
    .single();

  if (!region) return null;

  // 2. Fetch location
  const { data: location } = await supabase
    .from("locations")
    .select("*")
    .eq("region_id", region.id)
    .eq("slug", siteSlug)
    .eq("published", true)
    .single();

  if (!location) return null;

  // 3. Fetch all location_species with joined species data
  // Supabase returns max 1000 rows by default — paginate
  const allLocationSpecies: (LocationSpecies & { species: Species })[] = [];
  let from = 0;
  const pageSize = 500;
  let hasMore = true;

  while (hasMore) {
    const { data: batch } = await supabase
      .from("location_species")
      .select("*, species!inner(*)")
      .eq("location_id", location.id)
      .eq("species.published", true)
      .range(from, from + pageSize - 1)
      .order("total_observations", { ascending: false });

    if (!batch || batch.length === 0) {
      hasMore = false;
    } else {
      allLocationSpecies.push(...(batch as unknown as (LocationSpecies & { species: Species })[]));
      from += pageSize;
      if (batch.length < pageSize) hasMore = false;
    }
  }

  // 4. Fetch all seasonality data for this location's species
  const locationSpeciesIds = allLocationSpecies.map((ls) => ls.id);
  const seasonalityMap = new Map<string, SpeciesSeasonality[]>();

  // Batch in groups of 200 (Supabase .in() limit)
  for (let i = 0; i < locationSpeciesIds.length; i += 200) {
    const batch = locationSpeciesIds.slice(i, i + 200);
    const { data: seasonality } = await supabase
      .from("species_seasonality")
      .select("*")
      .in("location_species_id", batch);

    if (seasonality) {
      for (const s of seasonality) {
        const existing = seasonalityMap.get(s.location_species_id) ?? [];
        existing.push(s as SpeciesSeasonality);
        seasonalityMap.set(s.location_species_id, existing);
      }
    }
  }

  // 5. Build enriched species list
  const speciesList: LocationSpeciesWithDetails[] = allLocationSpecies.map((ls) => {
    const seasonality = seasonalityMap.get(ls.id) ?? [];
    const activeMonths = seasonality.filter(
      (s) => s.likelihood === "common" || s.likelihood === "occasional"
    );
    const activeMonthCount = activeMonths.length;
    const currentMonthEntry = seasonality.find((s) => s.month === currentMonth);
    const currentMonthLikelihood = currentMonthEntry?.likelihood ?? null;
    const isInSeason =
      activeMonthCount > 0 &&
      activeMonthCount <= 8 &&
      (currentMonthLikelihood === "common" || currentMonthLikelihood === "occasional");

    return {
      species: ls.species,
      locationSpecies: ls,
      currentMonthLikelihood,
      activeMonthCount,
      isInSeason,
    };
  });

  // 6. Sort: in-season first (by likelihood desc), then common, then occasional/rare, then out-of-season
  const likelihoodOrder: Record<string, number> = { common: 0, occasional: 1, rare: 2 };
  speciesList.sort((a, b) => {
    // In season first
    if (a.isInSeason && !b.isInSeason) return -1;
    if (!a.isInSeason && b.isInSeason) return 1;

    // Within same season status, sort by likelihood
    const aLikelihood = a.currentMonthLikelihood
      ? likelihoodOrder[a.currentMonthLikelihood] ?? 3
      : 3;
    const bLikelihood = b.currentMonthLikelihood
      ? likelihoodOrder[b.currentMonthLikelihood] ?? 3
      : 3;
    if (aLikelihood !== bLikelihood) return aLikelihood - bLikelihood;

    // Then by observation count
    return (b.locationSpecies.total_observations ?? 0) - (a.locationSpecies.total_observations ?? 0);
  });

  // 7. Best time to visit — month with highest average species activity
  const monthActivity = new Array(12).fill(0);
  for (const [, entries] of seasonalityMap) {
    for (const entry of entries) {
      if (entry.likelihood === "common") monthActivity[entry.month - 1] += 2;
      else if (entry.likelihood === "occasional") monthActivity[entry.month - 1] += 1;
    }
  }
  const bestMonthIndex = monthActivity.indexOf(Math.max(...monthActivity));
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const bestTimeToVisit = monthActivity[bestMonthIndex] > 0 ? monthNames[bestMonthIndex] : null;

  // 8. Nearby locations from same region
  const { data: nearbyRaw } = await supabase
    .from("locations")
    .select("id, name, slug, hero_image_url, skill_level, depth_min, depth_max, activities")
    .eq("region_id", region.id)
    .eq("published", true)
    .neq("id", location.id)
    .limit(4);

  const nearbyLocations: NearbyLocation[] = [];
  if (nearbyRaw && nearbyRaw.length > 0) {
    // Get species counts for nearby locations
    for (const nl of nearbyRaw) {
      const { count } = await supabase
        .from("location_species")
        .select("id", { count: "exact", head: true })
        .eq("location_id", nl.id);

      nearbyLocations.push({
        ...nl,
        speciesCount: count ?? 0,
        inSeasonCount: 0, // Simplified — would need full seasonality query per location
      } as NearbyLocation);
    }
  }

  return {
    region: region as Region,
    location: location as Location,
    speciesList,
    bestTimeToVisit,
    nearbyLocations,
    totalSpecies: speciesList.length,
    inSeasonCount: speciesList.filter((s) => s.isInSeason).length,
  };
}

// ─── SEO ─────────────────────────────────────────────────────────
type PageProps = { params: Promise<{ region: string; site: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { region: regionSlug, site: siteSlug } = await params;
  const data = await getLocationData(regionSlug, siteSlug);
  if (!data) return { title: "Location Not Found" };

  const { location, region, totalSpecies } = data;
  const title = `${location.name} — Snorkelling & Diving Species Guide`;
  const description =
    location.description?.slice(0, 155) ??
    `Discover ${totalSpecies} marine species at ${location.name}, ${region.name}. Species guide with seasonal data, photos, and identification help.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: location.hero_image_url ? [{ url: location.hero_image_url }] : [],
    },
  };
}

// ─── Page ────────────────────────────────────────────────────────
export default async function LocationPage({ params }: PageProps) {
  const { region: regionSlug, site: siteSlug } = await params;
  const data = await getLocationData(regionSlug, siteSlug);
  if (!data) notFound();

  const { region, location, speciesList, bestTimeToVisit, nearbyLocations, totalSpecies, inSeasonCount } = data;

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: location.name,
    description:
      location.description ??
      `Snorkelling and diving location in ${region.name}, Australia with ${totalSpecies} recorded marine species.`,
    geo: location.lat && location.lng
      ? {
          "@type": "GeoCoordinates",
          latitude: location.lat,
          longitude: location.lng,
        }
      : undefined,
    image: location.hero_image_url ?? undefined,
    isAccessibleForFree: true,
    touristType: location.activities,
    address: {
      "@type": "PostalAddress",
      addressRegion: region.name,
      addressCountry: "AU",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LocationPageClient
        region={region}
        location={location}
        speciesList={speciesList}
        bestTimeToVisit={bestTimeToVisit}
        nearbyLocations={nearbyLocations}
        totalSpecies={totalSpecies}
        inSeasonCount={inSeasonCount}
        regionSlug={regionSlug}
      />
    </>
  );
}
