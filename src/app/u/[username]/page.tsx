import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProfilePageClient } from "./ProfilePageClient";

// ─── Types ───────────────────────────────────────────────────────
export type ProfileTrip = {
  tripId: string;
  locationId: string;
  locationName: string;
  locationSlug: string;
  regionSlug: string;
  date: string;
  sightings: {
    id: string;
    speciesName: string;
    scientificName: string | null;
    speciesSlug: string;
    heroImageUrl: string | null;
    quantity: number;
    notes: string | null;
  }[];
};

export type SpottedSpecies = {
  slug: string;
  commonName: string;
  scientificName: string | null;
  heroImageUrl: string | null;
  isCherismatic: boolean;
  totalQuantity: number;
};

export type ProfileData = {
  userId: string;
  username: string;
  displayName: string;
  joinDate: string;
  totalSpecies: number;
  totalTrips: number;
  trips: ProfileTrip[];
  spottedSpecies: SpottedSpecies[];
};

// ─── Data fetching ───────────────────────────────────────────────
async function getProfileData(username: string): Promise<ProfileData | null> {
  const supabase = await createClient();

  // 1. Fetch user by username
  const { data: user } = await supabase
    .from("users")
    .select("id, username, display_name, created_at")
    .eq("username", username)
    .single();

  if (!user || !user.username) return null;

  // 2. Fetch all sightings for this user
  const { data: sightings } = await supabase
    .from("sightings")
    .select("id, species_id, location_id, sighted_at, quantity, notes, created_at")
    .eq("user_id", user.id)
    .order("sighted_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (!sightings || sightings.length === 0) {
    return {
      userId: user.id,
      username: user.username,
      displayName: user.display_name || user.username,
      joinDate: user.created_at,
      totalSpecies: 0,
      totalTrips: 0,
      trips: [],
      spottedSpecies: [],
    };
  }

  // 3. Batch-fetch species
  const speciesIds = [...new Set(sightings.map((s) => s.species_id))];
  const speciesMap = new Map<
    string,
    { name: string; scientific_name: string | null; slug: string; hero_image_url: string | null; is_charismatic: boolean }
  >();

  for (let i = 0; i < speciesIds.length; i += 200) {
    const batch = speciesIds.slice(i, i + 200);
    const { data: species } = await supabase
      .from("species")
      .select("id, name, scientific_name, slug, hero_image_url, is_charismatic")
      .in("id", batch);
    if (species) {
      for (const sp of species) {
        speciesMap.set(sp.id, sp);
      }
    }
  }

  // 4. Batch-fetch locations
  const locationIds = [...new Set(sightings.map((s) => s.location_id))];
  const locationMap = new Map<string, { name: string; slug: string; region_id: string }>();

  for (let i = 0; i < locationIds.length; i += 200) {
    const batch = locationIds.slice(i, i + 200);
    const { data: locations } = await supabase
      .from("locations")
      .select("id, name, slug, region_id")
      .in("id", batch);
    if (locations) {
      for (const loc of locations) {
        locationMap.set(loc.id, loc);
      }
    }
  }

  // 5. Batch-fetch regions
  const regionIds = [...new Set([...locationMap.values()].map((l) => l.region_id))];
  const regionMap = new Map<string, { slug: string }>();

  for (let i = 0; i < regionIds.length; i += 200) {
    const batch = regionIds.slice(i, i + 200);
    const { data: regions } = await supabase
      .from("regions")
      .select("id, slug")
      .in("id", batch);
    if (regions) {
      for (const r of regions) {
        regionMap.set(r.id, r);
      }
    }
  }

  // 6. Group sightings into trips
  const tripMap = new Map<string, ProfileTrip>();
  for (const s of sightings) {
    const loc = locationMap.get(s.location_id);
    const reg = loc ? regionMap.get(loc.region_id) : null;
    const sp = speciesMap.get(s.species_id);
    const locationSlug = loc?.slug ?? "";
    const key = `${s.location_id}__${s.sighted_at}`;
    const tripId = `${user.id}-${locationSlug}-${s.sighted_at}`;

    if (!tripMap.has(key)) {
      tripMap.set(key, {
        tripId,
        locationId: s.location_id,
        locationName: loc?.name ?? "Unknown location",
        locationSlug,
        regionSlug: reg?.slug ?? "",
        date: s.sighted_at,
        sightings: [],
      });
    }

    tripMap.get(key)!.sightings.push({
      id: s.id,
      speciesName: sp?.name ?? "Unknown species",
      scientificName: sp?.scientific_name ?? null,
      speciesSlug: sp?.slug ?? "",
      heroImageUrl: sp?.hero_image_url ?? null,
      quantity: s.quantity,
      notes: s.notes,
    });
  }

  // 7. Unique species list sorted: charismatic first, then alphabetical
  // Compute total quantity per species across all sightings
  const quantityBySpecies = new Map<string, number>();
  for (const s of sightings) {
    quantityBySpecies.set(s.species_id, (quantityBySpecies.get(s.species_id) ?? 0) + s.quantity);
  }

  const seenSpecies = new Set<string>();
  const spottedSpecies: SpottedSpecies[] = [];
  for (const spId of speciesIds) {
    if (seenSpecies.has(spId)) continue;
    seenSpecies.add(spId);
    const sp = speciesMap.get(spId);
    if (sp) {
      spottedSpecies.push({
        slug: sp.slug,
        commonName: sp.name,
        scientificName: sp.scientific_name,
        heroImageUrl: sp.hero_image_url,
        isCherismatic: sp.is_charismatic,
        totalQuantity: quantityBySpecies.get(spId) ?? 1,
      });
    }
  }

  spottedSpecies.sort((a, b) => {
    if (a.isCherismatic !== b.isCherismatic) return a.isCherismatic ? -1 : 1;
    return a.commonName.localeCompare(b.commonName);
  });

  const trips = Array.from(tripMap.values());

  return {
    userId: user.id,
    username: user.username,
    displayName: user.display_name || user.username,
    joinDate: user.created_at,
    totalSpecies: speciesIds.length,
    totalTrips: trips.length,
    trips,
    spottedSpecies,
  };
}

// ─── Metadata ────────────────────────────────────────────────────
type PageProps = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileData(username);

  if (!profile) {
    return { title: "User not found — Salt Safari" };
  }

  const description = `${profile.displayName} has spotted ${profile.totalSpecies} marine species across ${profile.totalTrips} swims. View their dive CV on Salt Safari.`;

  return {
    title: `${profile.displayName} (@${profile.username}) — Salt Safari`,
    description,
    openGraph: {
      title: `${profile.displayName} — Salt Safari`,
      description,
      type: "profile",
      url: `/u/${profile.username}`,
    },
  };
}

// ─── Page ────────────────────────────────────────────────────────
export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params;
  const profile = await getProfileData(username);

  if (!profile) {
    notFound();
  }

  return <ProfilePageClient profile={profile} />;
}
