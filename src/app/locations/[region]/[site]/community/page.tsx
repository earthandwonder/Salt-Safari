import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CommunityCalendarClient } from "./CommunityCalendarClient";

type PageProps = {
  params: Promise<{ region: string; site: string }>;
};

async function getCommunityCalendarData(regionSlug: string, siteSlug: string) {
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

  // 3. Fetch all sightings at this location to build calendar data
  //    We get distinct dates + counts rather than all rows
  const { data: sightings } = await supabase
    .from("sightings")
    .select("sighted_at, species_id, user_id")
    .eq("location_id", location.id)
    .order("sighted_at", { ascending: false });

  // 4. Aggregate by date
  const dateMap = new Map<
    string,
    { speciesIds: Set<string>; userIds: Set<string>; count: number }
  >();

  for (const s of sightings ?? []) {
    const dateStr = s.sighted_at;
    const existing = dateMap.get(dateStr);
    if (existing) {
      existing.speciesIds.add(s.species_id);
      existing.userIds.add(s.user_id);
      existing.count += 1;
    } else {
      dateMap.set(dateStr, {
        speciesIds: new Set([s.species_id]),
        userIds: new Set([s.user_id]),
        count: 1,
      });
    }
  }

  const calendarDays = Array.from(dateMap.entries()).map(([date, data]) => ({
    date,
    speciesCount: data.speciesIds.size,
    spotterCount: data.userIds.size,
    sightingCount: data.count,
  }));

  // 5. Overall stats
  const allSpeciesIds = new Set<string>();
  const allUserIds = new Set<string>();
  for (const s of sightings ?? []) {
    allSpeciesIds.add(s.species_id);
    allUserIds.add(s.user_id);
  }

  return {
    region,
    location,
    calendarDays,
    totalSpecies: allSpeciesIds.size,
    totalSpotters: allUserIds.size,
    totalSightings: sightings?.length ?? 0,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { region, site } = await params;
  const data = await getCommunityCalendarData(region, site);
  if (!data) return { title: "Community Not Found" };

  const title = `Community Sightings — ${data.location.name}`;
  const description = `See what the community is spotting at ${data.location.name}. ${data.totalSpecies} species logged by ${data.totalSpotters} swimmers.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  };
}

export default async function CommunityCalendarPage({ params }: PageProps) {
  const { region: regionSlug, site: siteSlug } = await params;
  const data = await getCommunityCalendarData(regionSlug, siteSlug);
  if (!data) notFound();

  return (
    <CommunityCalendarClient
      regionSlug={regionSlug}
      siteSlug={siteSlug}
      regionName={data.region.name}
      locationName={data.location.name}
      locationHeroUrl={data.location.hero_image_url}
      calendarDays={data.calendarDays}
      totalSpecies={data.totalSpecies}
      totalSpotters={data.totalSpotters}
      totalSightings={data.totalSightings}
    />
  );
}
