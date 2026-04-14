import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CommunityDayClient } from "./CommunityDayClient";

type PageProps = {
  params: Promise<{ region: string; site: string; date: string }>;
};

type CommunitySpecies = {
  id: string;
  name: string;
  scientificName: string | null;
  slug: string;
  heroImageUrl: string | null;
  observationCount: number;
};

type Contributor = {
  userId: string;
  displayName: string;
  username: string | null;
  sightingCount: number;
};

async function getCommunityDayData(
  regionSlug: string,
  siteSlug: string,
  dateStr: string
) {
  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const parsedDate = new Date(dateStr + "T00:00:00");
  if (isNaN(parsedDate.getTime())) return null;

  const supabase = await createClient();

  // 1. Fetch region
  const { data: region } = await supabase
    .from("regions")
    .select("id, name, slug")
    .eq("slug", regionSlug)
    .eq("published", true)
    .single();
  if (!region) return null;

  // 2. Fetch location
  const { data: location } = await supabase
    .from("locations")
    .select("id, name, slug, hero_image_url")
    .eq("region_id", region.id)
    .eq("slug", siteSlug)
    .eq("published", true)
    .single();
  if (!location) return null;

  // 3. Fetch all sightings at this location on this date
  const { data: sightings } = await supabase
    .from("sightings")
    .select(
      `
      id,
      user_id,
      species_id,
      quantity,
      species:species_id (id, name, scientific_name, slug, hero_image_url),
      users:user_id (id, display_name, username)
    `
    )
    .eq("location_id", location.id)
    .eq("sighted_at", dateStr);

  if (!sightings || sightings.length === 0) {
    return {
      region,
      location,
      date: dateStr,
      species: [] as CommunitySpecies[],
      contributors: [] as Contributor[],
      totalSightings: 0,
    };
  }

  // 4. Aggregate species with observation counts
  const speciesMap = new Map<
    string,
    CommunitySpecies
  >();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const s of sightings as any[]) {
    const sp = s.species;
    if (!sp) continue;
    const existing = speciesMap.get(sp.id);
    if (existing) {
      existing.observationCount += s.quantity ?? 1;
    } else {
      speciesMap.set(sp.id, {
        id: sp.id,
        name: sp.name,
        scientificName: sp.scientific_name,
        slug: sp.slug,
        heroImageUrl: sp.hero_image_url,
        observationCount: s.quantity ?? 1,
      });
    }
  }

  // 5. Aggregate contributors
  const contributorMap = new Map<string, Contributor>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const s of sightings as any[]) {
    const user = s.users;
    if (!user) continue;
    const existing = contributorMap.get(user.id);
    if (existing) {
      existing.sightingCount += 1;
    } else {
      contributorMap.set(user.id, {
        userId: user.id,
        displayName: user.display_name ?? "Anonymous",
        username: user.username ?? null,
        sightingCount: 1,
      });
    }
  }

  const species = Array.from(speciesMap.values()).sort(
    (a, b) => b.observationCount - a.observationCount
  );
  const contributors = Array.from(contributorMap.values()).sort(
    (a, b) => b.sightingCount - a.sightingCount
  );

  return {
    region,
    location,
    date: dateStr,
    species,
    contributors,
    totalSightings: sightings.length,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { region, site, date } = await params;
  const data = await getCommunityDayData(region, site, date);
  if (!data) return { title: "Community Day Not Found" };

  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const speciesCount = data.species.length;
  const title = `${speciesCount} species spotted at ${data.location.name} — ${formattedDate}`;
  const description = `Community sightings at ${data.location.name} on ${formattedDate}. ${speciesCount} species spotted by ${data.contributors.length} swimmers.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  };
}

export default async function CommunityDayPage({ params }: PageProps) {
  const { region: regionSlug, site: siteSlug, date } = await params;
  const data = await getCommunityDayData(regionSlug, siteSlug, date);
  if (!data) notFound();

  return (
    <CommunityDayClient
      regionSlug={regionSlug}
      siteSlug={siteSlug}
      regionName={data.region.name}
      locationName={data.location.name}
      locationHeroUrl={data.location.hero_image_url}
      date={data.date}
      species={data.species}
      contributors={data.contributors}
      totalSightings={data.totalSightings}
    />
  );
}
