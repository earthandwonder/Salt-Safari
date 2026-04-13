"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";

type SightingWithDetails = {
  id: string;
  species_id: string;
  location_id: string;
  sighted_at: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  speciesName: string;
  scientificName: string | null;
  speciesSlug: string;
  heroImageUrl: string | null;
  locationName: string;
  locationSlug: string;
  regionSlug: string;
};

type Trip = {
  key: string;
  locationId: string;
  locationName: string;
  locationSlug: string;
  regionSlug: string;
  date: string;
  sightings: SightingWithDetails[];
};

export default function SightingLogPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [totalSpeciesCount, setTotalSpeciesCount] = useState(0);

  useEffect(() => {
    async function load() {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }
      setAuthChecked(true);

      // Fetch all sightings
      const { data: sightings } = await supabase
        .from("sightings")
        .select("id, species_id, location_id, sighted_at, quantity, notes, created_at")
        .eq("user_id", user.id)
        .order("sighted_at", { ascending: false })
        .order("created_at", { ascending: false });

      if (!sightings || sightings.length === 0) {
        setLoading(false);
        return;
      }

      // Batch-fetch species
      const speciesIds = [...new Set(sightings.map((s) => s.species_id))];
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

      // Batch-fetch locations
      const locationIds = [...new Set(sightings.map((s) => s.location_id))];
      const locationMap = new Map<
        string,
        { name: string; slug: string; region_id: string }
      >();

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

      // Batch-fetch regions
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

      // Enrich sightings
      const enriched: SightingWithDetails[] = sightings.map((s) => {
        const sp = speciesMap.get(s.species_id);
        const loc = locationMap.get(s.location_id);
        const reg = loc ? regionMap.get(loc.region_id) : null;
        return {
          ...s,
          speciesName: sp?.name ?? "Unknown species",
          scientificName: sp?.scientific_name ?? null,
          speciesSlug: sp?.slug ?? "",
          heroImageUrl: sp?.hero_image_url ?? null,
          locationName: loc?.name ?? "Unknown location",
          locationSlug: loc?.slug ?? "",
          regionSlug: reg?.slug ?? "",
        };
      });

      // Group by trip (location + date)
      const tripMap = new Map<string, Trip>();
      for (const s of enriched) {
        const key = `${s.location_id}__${s.sighted_at}`;
        if (!tripMap.has(key)) {
          tripMap.set(key, {
            key,
            locationId: s.location_id,
            locationName: s.locationName,
            locationSlug: s.locationSlug,
            regionSlug: s.regionSlug,
            date: s.sighted_at,
            sightings: [],
          });
        }
        tripMap.get(key)!.sightings.push(s);
      }

      // Count unique species across all sightings
      setTotalSpeciesCount(speciesIds.length);
      setTrips(Array.from(tripMap.values()));
      setLoading(false);
    }

    load();
  }, [router]);

  const totalSightings = useMemo(
    () => trips.reduce((sum, t) => sum + t.sightings.length, 0),
    [trips]
  );

  if (!authChecked && loading) {
    return (
      <div className="min-h-screen bg-sand">
        <Header />
        <div className="pt-28 pb-20 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand">
      <Header />

      {/* ══════════════════════════════════════════
          HERO
         ══════════════════════════════════════════ */}
      <section className="relative w-full overflow-hidden">
        <div className="absolute inset-0 hero-gradient">
          <div className="caustic-overlay" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-12 md:pt-32 md:pb-16">
          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold text-white tracking-tight">
            Your Sighting Log
          </h1>
          {!loading && trips.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 mt-5">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white/80 backdrop-blur-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {totalSightings} sighting{totalSightings !== 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-200 backdrop-blur-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {totalSpeciesCount} species spotted
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-teal-500/20 text-teal-200 backdrop-blur-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {trips.length} trip{trips.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TRIPS LIST
         ══════════════════════════════════════════ */}
      <div className="max-w-4xl mx-auto px-6 py-10 md:py-14">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-white border border-slate-100 p-5 animate-pulse">
                <div className="h-5 w-48 bg-slate-100 rounded mb-2" />
                <div className="h-3 w-32 bg-slate-50 rounded mb-4" />
                <div className="flex gap-2">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="w-12 h-12 rounded-lg bg-slate-100" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : trips.length === 0 ? (
          /* ── Empty state ──────────────────────── */
          <div className="rounded-2xl bg-white border border-slate-100 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-teal-50 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <h2 className="font-display text-xl font-semibold text-deep mb-2">
              No sightings yet
            </h2>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
              Head to a dive site and start logging the species you spot. Your collection builds up over time.
            </p>
            <Link
              href="/locations"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm transition-colors"
            >
              Explore locations
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        ) : (
          /* ── Trip cards ───────────────────────── */
          <div className="space-y-4">
            {trips.map((trip) => (
              <TripCard key={trip.key} trip={trip} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const formattedDate = formatDate(trip.date);
  const speciesCount = trip.sightings.length;
  const locationHref = `/locations/${trip.regionSlug}/${trip.locationSlug}`;

  // Show up to 8 species thumbnails
  const thumbnails = trip.sightings.slice(0, 8);
  const overflowCount = speciesCount - thumbnails.length;

  return (
    <div className="rounded-xl bg-white border border-slate-100 p-5 md:p-6 hover:border-slate-200 transition-colors">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <Link
            href={locationHref}
            className="font-display text-lg font-semibold text-deep hover:text-teal-700 transition-colors leading-tight"
          >
            {trip.locationName}
          </Link>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {formattedDate}
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {speciesCount} species
        </span>
      </div>

      {/* Thumbnails row */}
      <div className="flex items-center gap-2 flex-wrap">
        {thumbnails.map((s) => (
          <Link
            key={s.id}
            href={`/species/${s.speciesSlug}`}
            className="group/thumb relative"
            title={s.speciesName}
          >
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden border-2 border-white shadow-sm group-hover/thumb:border-teal-300 transition-colors">
              {s.heroImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.heroImageUrl}
                  alt={s.speciesName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full photo-placeholder-species" />
              )}
            </div>
            {s.quantity > 1 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-deep text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                {s.quantity}
              </span>
            )}
          </Link>
        ))}
        {overflowCount > 0 && (
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500">
            +{overflowCount}
          </div>
        )}
      </div>

      {/* Notes preview — show first sighting with notes */}
      {trip.sightings.some((s) => s.notes) && (
        <p className="mt-3 text-xs text-slate-400 italic truncate">
          &ldquo;{trip.sightings.find((s) => s.notes)?.notes}&rdquo;
        </p>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
