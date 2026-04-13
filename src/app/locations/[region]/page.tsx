import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Region, Species, SpeciesSeasonality } from "@/types";
import { RegionPageClient } from "./RegionPageClient";

// ─── Types ───────────────────────────────────────────────────────
export type RegionLocation = {
  id: string;
  name: string;
  slug: string;
  hero_image_url: string | null;
  skill_level: "beginner" | "intermediate" | "advanced" | null;
  depth_min: number | null;
  depth_max: number | null;
  activities: string[];
  lat: number | null;
  lng: number | null;
  speciesCount: number;
  inSeasonCount: number;
};

export type RegionSpecies = {
  species: Species;
  totalObservations: number;
  currentMonthLikelihood: "common" | "occasional" | "rare" | null;
  activeMonthCount: number;
  isInSeason: boolean;
};

// ─── Data fetching ───────────────────────────────────────────────
async function getRegionData(regionSlug: string) {
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

  // 2. Fetch all published locations in this region
  const { data: locationsRaw } = await supabase
    .from("locations")
    .select("id, name, slug, hero_image_url, skill_level, depth_min, depth_max, activities, lat, lng")
    .eq("region_id", region.id)
    .eq("published", true)
    .order("name", { ascending: true });

  if (!locationsRaw) return null;

  // 3. For each location, get species count + in-season count
  const locations: RegionLocation[] = [];
  for (const loc of locationsRaw) {
    // Species count
    const { count: speciesCount } = await supabase
      .from("location_species")
      .select("id", { count: "exact", head: true })
      .eq("location_id", loc.id);

    // In-season count: species with seasonality this month (common/occasional)
    // AND active ≤8 months total
    // We need to query location_species IDs first, then check seasonality
    let inSeasonCount = 0;

    // Get all location_species IDs for this location
    const allLsIds: string[] = [];
    let from = 0;
    const pageSize = 500;
    let hasMore = true;
    while (hasMore) {
      const { data: lsBatch } = await supabase
        .from("location_species")
        .select("id")
        .eq("location_id", loc.id)
        .range(from, from + pageSize - 1);

      if (!lsBatch || lsBatch.length === 0) {
        hasMore = false;
      } else {
        allLsIds.push(...lsBatch.map((ls) => ls.id));
        from += pageSize;
        if (lsBatch.length < pageSize) hasMore = false;
      }
    }

    if (allLsIds.length > 0) {
      // Fetch all seasonality records for this location's species
      const allSeasonality: SpeciesSeasonality[] = [];
      for (let i = 0; i < allLsIds.length; i += 200) {
        const batch = allLsIds.slice(i, i + 200);
        const { data: seasonality } = await supabase
          .from("species_seasonality")
          .select("*")
          .in("location_species_id", batch);

        if (seasonality) {
          allSeasonality.push(...(seasonality as SpeciesSeasonality[]));
        }
      }

      // Group by location_species_id
      const seasonByLs = new Map<string, SpeciesSeasonality[]>();
      for (const s of allSeasonality) {
        const existing = seasonByLs.get(s.location_species_id) ?? [];
        existing.push(s);
        seasonByLs.set(s.location_species_id, existing);
      }

      // Count in-season species
      for (const [, entries] of seasonByLs) {
        const activeMonths = entries.filter(
          (e) => e.likelihood === "common" || e.likelihood === "occasional"
        );
        const currentEntry = entries.find((e) => e.month === currentMonth);
        const isActive =
          currentEntry &&
          (currentEntry.likelihood === "common" || currentEntry.likelihood === "occasional");
        if (activeMonths.length > 0 && activeMonths.length <= 8 && isActive) {
          inSeasonCount++;
        }
      }
    }

    locations.push({
      ...loc,
      speciesCount: speciesCount ?? 0,
      inSeasonCount,
    } as RegionLocation);
  }

  // 4. Fetch top species across all locations in the region
  // Get all location IDs
  const locationIds = locationsRaw.map((l) => l.id);

  // Fetch location_species for all locations, ordered by total_observations
  // We'll aggregate across locations and pick top species
  const speciesAggMap = new Map<
    string,
    { speciesId: string; totalObs: number; locationSpeciesIds: string[] }
  >();

  for (let i = 0; i < locationIds.length; i += 200) {
    const locBatch = locationIds.slice(i, i + 200);
    let lsFrom = 0;
    let lsHasMore = true;

    while (lsHasMore) {
      const { data: lsBatch } = await supabase
        .from("location_species")
        .select("id, species_id, total_observations")
        .in("location_id", locBatch)
        .range(lsFrom, lsFrom + 499);

      if (!lsBatch || lsBatch.length === 0) {
        lsHasMore = false;
      } else {
        for (const ls of lsBatch) {
          const existing = speciesAggMap.get(ls.species_id);
          if (existing) {
            existing.totalObs += ls.total_observations ?? 0;
            existing.locationSpeciesIds.push(ls.id);
          } else {
            speciesAggMap.set(ls.species_id, {
              speciesId: ls.species_id,
              totalObs: ls.total_observations ?? 0,
              locationSpeciesIds: [ls.id],
            });
          }
        }
        lsFrom += 500;
        if (lsBatch.length < 500) lsHasMore = false;
      }
    }
  }

  // Sort by total observations, take top 24
  const topSpeciesEntries = Array.from(speciesAggMap.values())
    .sort((a, b) => b.totalObs - a.totalObs)
    .slice(0, 24);

  // Fetch species details
  const topSpeciesIds = topSpeciesEntries.map((e) => e.speciesId);
  const speciesMap = new Map<string, Species>();

  for (let i = 0; i < topSpeciesIds.length; i += 200) {
    const batch = topSpeciesIds.slice(i, i + 200);
    const { data: speciesBatch } = await supabase
      .from("species")
      .select("*")
      .in("id", batch)
      .eq("published", true);

    if (speciesBatch) {
      for (const sp of speciesBatch) {
        speciesMap.set(sp.id, sp as Species);
      }
    }
  }

  // Fetch seasonality for top species
  const allTopLsIds = topSpeciesEntries.flatMap((e) => e.locationSpeciesIds);
  const topSeasonalityMap = new Map<string, SpeciesSeasonality[]>();

  for (let i = 0; i < allTopLsIds.length; i += 200) {
    const batch = allTopLsIds.slice(i, i + 200);
    const { data: seasonality } = await supabase
      .from("species_seasonality")
      .select("*")
      .in("location_species_id", batch);

    if (seasonality) {
      for (const s of seasonality) {
        const existing = topSeasonalityMap.get(s.location_species_id) ?? [];
        existing.push(s as SpeciesSeasonality);
        topSeasonalityMap.set(s.location_species_id, existing);
      }
    }
  }

  // Build top species list with aggregated seasonality
  const topSpecies: RegionSpecies[] = [];
  for (const entry of topSpeciesEntries) {
    const species = speciesMap.get(entry.speciesId);
    if (!species) continue;

    // Aggregate seasonality across all locations for this species
    const allEntries: SpeciesSeasonality[] = [];
    for (const lsId of entry.locationSpeciesIds) {
      const entries = topSeasonalityMap.get(lsId);
      if (entries) allEntries.push(...entries);
    }

    // Merge by month — take the "best" likelihood per month
    const monthBest = new Map<number, "common" | "occasional" | "rare">();
    const likelihoodRank: Record<string, number> = { common: 0, occasional: 1, rare: 2 };
    for (const s of allEntries) {
      const current = monthBest.get(s.month);
      if (!current || likelihoodRank[s.likelihood] < likelihoodRank[current]) {
        monthBest.set(s.month, s.likelihood);
      }
    }

    const activeMonths = Array.from(monthBest.entries()).filter(
      ([, l]) => l === "common" || l === "occasional"
    );
    const activeMonthCount = activeMonths.length;
    const currentMonthLikelihood = monthBest.get(currentMonth) ?? null;
    const isInSeason =
      activeMonthCount > 0 &&
      activeMonthCount <= 8 &&
      (currentMonthLikelihood === "common" || currentMonthLikelihood === "occasional");

    topSpecies.push({
      species,
      totalObservations: entry.totalObs,
      currentMonthLikelihood,
      activeMonthCount,
      isInSeason,
    });
  }

  return {
    region: region as Region,
    locations,
    topSpecies,
    totalLocations: locations.length,
  };
}

// ─── SEO ─────────────────────────────────────────────────────────
type PageProps = { params: Promise<{ region: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { region: regionSlug } = await params;
  const data = await getRegionData(regionSlug);
  if (!data) return { title: "Region Not Found" };

  const { region, totalLocations } = data;
  const title = `${region.name} — Snorkelling & Diving Spots`;
  const description =
    region.description?.slice(0, 155) ??
    `Discover ${totalLocations} snorkelling and diving locations in ${region.name}. Species guides, seasonal data, and dive site information.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: region.hero_image_url ? [{ url: region.hero_image_url }] : [],
    },
  };
}

// ─── Page ────────────────────────────────────────────────────────
export default async function RegionPage({ params }: PageProps) {
  const { region: regionSlug } = await params;
  const data = await getRegionData(regionSlug);
  if (!data) notFound();

  const { region, locations, topSpecies, totalLocations } = data;

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: region.name,
    description:
      region.description ??
      `Snorkelling and diving region in Australia with ${totalLocations} dive sites.`,
    image: region.hero_image_url ?? undefined,
    containedInPlace: {
      "@type": "Country",
      name: "Australia",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RegionPageClient
        region={region}
        locations={locations}
        topSpecies={topSpecies}
        totalLocations={totalLocations}
        regionSlug={regionSlug}
      />
    </>
  );
}
