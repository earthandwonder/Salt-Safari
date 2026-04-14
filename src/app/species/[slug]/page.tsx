import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Species, Photo, Location, Region, LocationSpecies, SpeciesSeasonality } from "@/types";
import { SpeciesPageClient } from "./SpeciesPageClient";

export const revalidate = 3600;

// ─── Types ───────────────────────────────────────────────────────
export type LocationOccurrence = {
  location: Pick<Location, "id" | "name" | "slug"> & { region: Pick<Region, "name" | "slug"> };
  locationSpecies: LocationSpecies;
  seasonality: SpeciesSeasonality[];
  /** Likelihood for the current month, or null if no seasonality data. */
  currentMonthLikelihood: "common" | "occasional" | "rare" | null;
};

export type SimilarSpecies = Pick<Species, "id" | "name" | "scientific_name" | "slug" | "hero_image_url">;

// ─── Data fetching ───────────────────────────────────────────────
async function getSpeciesData(slug: string) {
  const supabase = await createClient();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  // 1. Fetch species by slug
  const { data: species } = await supabase
    .from("species")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (!species) return null;

  // 2. Fetch all photos for this species (hero first)
  const { data: photos } = await supabase
    .from("photos")
    .select("*")
    .eq("species_id", species.id)
    .order("is_hero", { ascending: false })
    .order("created_at", { ascending: true });

  // 3. Fetch all locations where this species appears
  const allLocationSpecies: (LocationSpecies & {
    locations: Pick<Location, "id" | "name" | "slug" | "region_id"> | null;
  })[] = [];
  let from = 0;
  const pageSize = 500;
  let hasMore = true;

  while (hasMore) {
    const { data: batch } = await supabase
      .from("location_species")
      .select("*, locations!inner(id, name, slug, region_id)")
      .eq("species_id", species.id)
      .eq("locations.published", true)
      .range(from, from + pageSize - 1)
      .order("total_observations", { ascending: false });

    if (!batch || batch.length === 0) {
      hasMore = false;
    } else {
      allLocationSpecies.push(
        ...(batch as unknown as typeof allLocationSpecies)
      );
      from += pageSize;
      if (batch.length < pageSize) hasMore = false;
    }
  }

  // 4. Fetch regions for those locations
  const regionIds = [
    ...new Set(allLocationSpecies.map((ls) => ls.locations?.region_id).filter(Boolean)),
  ] as string[];
  const regionMap = new Map<string, Pick<Region, "name" | "slug">>();

  for (let i = 0; i < regionIds.length; i += 200) {
    const batch = regionIds.slice(i, i + 200);
    const { data: regions } = await supabase
      .from("regions")
      .select("id, name, slug")
      .in("id", batch);

    if (regions) {
      for (const r of regions) {
        regionMap.set(r.id, { name: r.name, slug: r.slug });
      }
    }
  }

  // 5. Fetch seasonality data for each location_species
  const locationSpeciesIds = allLocationSpecies.map((ls) => ls.id);
  const seasonalityMap = new Map<string, SpeciesSeasonality[]>();

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

  // 6. Build location occurrences
  const locationOccurrences: LocationOccurrence[] = allLocationSpecies
    .filter((ls) => ls.locations)
    .map((ls) => {
      const loc = ls.locations!;
      const region = regionMap.get(loc.region_id) ?? { name: "Unknown", slug: "unknown" };
      const seasonality = seasonalityMap.get(ls.id) ?? [];
      const currentMonthEntry = seasonality.find((s) => s.month === currentMonth);

      return {
        location: {
          id: loc.id,
          name: loc.name,
          slug: loc.slug,
          region,
        },
        locationSpecies: ls as LocationSpecies,
        seasonality,
        currentMonthLikelihood: currentMonthEntry?.likelihood ?? null,
      };
    });

  // Sort by total observation count descending
  locationOccurrences.sort(
    (a, b) => (b.locationSpecies.total_observations ?? 0) - (a.locationSpecies.total_observations ?? 0)
  );

  // 7. Fetch similar species (same family, different species)
  let similarSpecies: SimilarSpecies[] = [];
  if (species.family) {
    const { data: similar } = await supabase
      .from("species")
      .select("id, name, scientific_name, slug, hero_image_url")
      .eq("family", species.family)
      .eq("published", true)
      .neq("id", species.id)
      .limit(4);

    if (similar) {
      similarSpecies = similar;
    }
  }

  return {
    species: species as Species,
    photos: (photos ?? []) as Photo[],
    locationOccurrences,
    similarSpecies,
  };
}

// ─── SEO ─────────────────────────────────────────────────────────
type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getSpeciesData(slug);
  if (!data) return { title: "Species Not Found" };

  const { species, locationOccurrences } = data;
  const locationCount = locationOccurrences.length;
  const title = `${species.name}${species.scientific_name ? ` (${species.scientific_name})` : ""} — Salt Safari`;
  const description =
    species.summary?.slice(0, 155) ??
    `${species.name} species guide. ${locationCount > 0 ? `Found at ${locationCount} location${locationCount !== 1 ? "s" : ""}.` : ""} Photos, seasonality data, and identification help.`;

  return {
    title,
    description,
    alternates: { canonical: `/species/${slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: species.hero_image_url ? [{ url: species.hero_image_url }] : [],
    },
  };
}

// ─── Page ────────────────────────────────────────────────────────
export default async function SpeciesPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getSpeciesData(slug);
  if (!data) notFound();

  const { species, photos, locationOccurrences, similarSpecies } = data;

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Thing",
    name: species.name,
    alternateName: species.scientific_name ?? undefined,
    description:
      species.summary ??
      `${species.name} — marine species found in Australian waters.`,
    image: species.hero_image_url ?? undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SpeciesPageClient
        species={species}
        photos={photos}
        locationOccurrences={locationOccurrences}
        similarSpecies={similarSpecies}
      />
    </>
  );
}
