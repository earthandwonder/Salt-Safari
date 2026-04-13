import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { TripPageClient } from "./TripPageClient";

// ─── Types ───────────────────────────────────────────────────────
export type TripSighting = {
  id: string;
  speciesName: string;
  scientificName: string | null;
  speciesSlug: string;
  heroImageUrl: string | null;
  quantity: number;
  notes: string | null;
};

export type TripData = {
  tripId: string;
  userId: string;
  displayName: string;
  username: string | null;
  locationName: string;
  locationSlug: string;
  regionSlug: string;
  regionName: string;
  date: string;
  sightings: TripSighting[];
  totalSpeciesAtLocation: number;
};

// ─── Trip ID parsing ─────────────────────────────────────────────
// Format: {userId}-{locationSlug}-{YYYY-MM-DD}
// The userId is a UUID (36 chars with hyphens), date is last 10 chars
function parseTripId(tripId: string): { userId: string; locationSlug: string; date: string } | null {
  // UUID is 36 chars: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  // Date is 10 chars: YYYY-MM-DD
  // Middle part is the location slug
  if (tripId.length < 48) return null; // 36 + 1 + 1 + 10 minimum

  const userId = tripId.slice(0, 36);
  const date = tripId.slice(-10);
  const locationSlug = tripId.slice(37, -11);

  // Validate UUID format roughly
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(userId)) {
    return null;
  }
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!locationSlug) return null;

  return { userId, locationSlug, date };
}

// ─── Data fetching ───────────────────────────────────────────────
async function getTripData(tripId: string): Promise<TripData | null> {
  const parsed = parseTripId(tripId);
  if (!parsed) return null;

  const supabase = await createClient();

  // 1. Fetch user
  const { data: user } = await supabase
    .from("users")
    .select("id, display_name, username")
    .eq("id", parsed.userId)
    .single();

  if (!user) return null;

  // 2. Fetch location by slug
  const { data: location } = await supabase
    .from("locations")
    .select("id, name, slug, region_id")
    .eq("slug", parsed.locationSlug)
    .single();

  if (!location) return null;

  // 3. Fetch region
  const { data: region } = await supabase
    .from("regions")
    .select("slug, name")
    .eq("id", location.region_id)
    .single();

  // 4. Fetch sightings for this trip (user + location + date)
  const { data: sightings } = await supabase
    .from("sightings")
    .select("id, species_id, quantity, notes")
    .eq("user_id", parsed.userId)
    .eq("location_id", location.id)
    .eq("sighted_at", parsed.date);

  if (!sightings || sightings.length === 0) return null;

  // 5. Batch-fetch species
  const speciesIds = sightings.map((s) => s.species_id);
  const speciesMap = new Map<
    string,
    { name: string; scientific_name: string | null; slug: string; hero_image_url: string | null }
  >();

  for (let i = 0; i < speciesIds.length; i += 200) {
    const batch = speciesIds.slice(i, i + 200);
    const { data: species } = await supabase
      .from("species")
      .select("id, name, scientific_name, slug, hero_image_url")
      .in("id", batch);
    if (species) {
      for (const sp of species) {
        speciesMap.set(sp.id, sp);
      }
    }
  }

  // 6. Total species at this location (for progress bar)
  const { count: totalSpeciesAtLocation } = await supabase
    .from("location_species")
    .select("id", { count: "exact", head: true })
    .eq("location_id", location.id);

  // 7. Build sightings list
  const tripSightings: TripSighting[] = sightings.map((s) => {
    const sp = speciesMap.get(s.species_id);
    return {
      id: s.id,
      speciesName: sp?.name ?? "Unknown species",
      scientificName: sp?.scientific_name ?? null,
      speciesSlug: sp?.slug ?? "",
      heroImageUrl: sp?.hero_image_url ?? null,
      quantity: s.quantity,
      notes: s.notes,
    };
  });

  return {
    tripId,
    userId: user.id,
    displayName: user.display_name || user.username || "A diver",
    username: user.username,
    locationName: location.name,
    locationSlug: location.slug,
    regionSlug: region?.slug ?? "",
    regionName: region?.name ?? "",
    date: parsed.date,
    sightings: tripSightings,
    totalSpeciesAtLocation: totalSpeciesAtLocation ?? 0,
  };
}

// ─── Metadata ────────────────────────────────────────────────────
type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const trip = await getTripData(id);

  if (!trip) {
    return { title: "Trip not found — Salt Safari" };
  }

  const description = `${trip.displayName} saw ${trip.sightings.length} species at ${trip.locationName} on ${formatDateForMeta(trip.date)}. See the full trip report on Salt Safari.`;

  return {
    title: `${trip.displayName} saw ${trip.sightings.length} species at ${trip.locationName} — Salt Safari`,
    description,
    openGraph: {
      title: `${trip.displayName} saw ${trip.sightings.length} species at ${trip.locationName}`,
      description,
      type: "article",
      url: `/trips/${trip.tripId}`,
    },
  };
}

function formatDateForMeta(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

// ─── Page ────────────────────────────────────────────────────────
export default async function TripDetailPage({ params }: PageProps) {
  const { id } = await params;
  const trip = await getTripData(id);

  if (!trip) {
    notFound();
  }

  return <TripPageClient trip={trip} />;
}
