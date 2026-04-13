"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WaveDivider } from "@/components/WaveDivider";
import { TabBar, TabPanel } from "@/components/TabBar";
import { ResponsiveGrid } from "@/components/ResponsiveGrid";
import { SpeciesCard } from "@/components/SpeciesCard";
import type { ProfileData, ProfileTrip } from "./page";

const TABS = [
  { id: "trips", label: "Trips" },
  { id: "spotted", label: "Spotted" },
];

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function formatJoinDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `Joined ${date.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}`;
}

function formatTripDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ProfilePageClient({ profile }: { profile: ProfileData }) {
  const [activeTab, setActiveTab] = useState("trips");
  const initials = getInitials(profile.displayName);

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

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-28 pb-14 md:pt-32 md:pb-18 flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-900/30 ring-4 ring-white/10 mb-4">
            <span className="font-display text-2xl md:text-3xl font-semibold text-white tracking-tight">
              {initials}
            </span>
          </div>

          {/* Name + username */}
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-white tracking-tight">
            {profile.displayName}
          </h1>
          <p className="text-white/50 text-sm mt-1">@{profile.username}</p>

          {/* Join date */}
          <p className="text-white/40 text-xs mt-2">
            {formatJoinDate(profile.joinDate)}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-sm font-medium text-white">
                {profile.totalSpecies} <span className="text-white/60">species</span>
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-teal-400">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="text-sm font-medium text-white">
                {profile.totalTrips} <span className="text-white/60">trip{profile.totalTrips !== 1 ? "s" : ""}</span>
              </span>
            </div>
          </div>
        </div>

        <WaveDivider fill="#FFFBF5" />
      </section>

      {/* ══════════════════════════════════════════
          TABS
         ══════════════════════════════════════════ */}
      <div className="max-w-4xl mx-auto px-6 -mt-2">
        <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* ── Trips tab ────────────────────────── */}
        <TabPanel tabId="trips" activeTab={activeTab}>
          <div className="py-8">
            {profile.trips.length === 0 ? (
              <EmptyTrips />
            ) : (
              <div className="space-y-4">
                {profile.trips.map((trip) => (
                  <TripCard key={trip.tripId} trip={trip} />
                ))}
              </div>
            )}
          </div>
        </TabPanel>

        {/* ── Spotted tab ──────────────────────── */}
        <TabPanel tabId="spotted" activeTab={activeTab}>
          <div className="py-8">
            {profile.spottedSpecies.length === 0 ? (
              <EmptySpotted />
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-5">
                  {profile.totalSpecies} species spotted across all locations
                </p>
                <ResponsiveGrid columns={{ mobile: 2, tablet: 3, desktop: 4 }}>
                  {profile.spottedSpecies.map((sp) => (
                    <SpeciesCard
                      key={sp.slug}
                      slug={sp.slug}
                      commonName={sp.commonName}
                      scientificName={sp.scientificName}
                      heroImageUrl={sp.heroImageUrl}
                      likelihood="common"
                      isSpotted
                    />
                  ))}
                </ResponsiveGrid>
              </>
            )}
          </div>
        </TabPanel>
      </div>

      <Footer />
    </div>
  );
}

// ─── Trip Card ─────────────────────────────────────────────────────
function TripCard({ trip }: { trip: ProfileTrip }) {
  const speciesCount = trip.sightings.length;
  const locationHref = `/locations/${trip.regionSlug}/${trip.locationSlug}`;
  const tripHref = `/trips/${trip.tripId}`;

  // Overlapping thumbnail stack (up to 5)
  const thumbs = trip.sightings.slice(0, 5);
  const overflow = speciesCount - thumbs.length;

  const firstNote = trip.sightings.find((s) => s.notes)?.notes;

  return (
    <Link
      href={tripHref}
      className="block rounded-xl bg-white border border-slate-100 p-5 md:p-6 hover:border-slate-200 hover:shadow-sm transition-all group"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <span
            className="font-display text-lg font-semibold text-deep group-hover:text-teal-700 transition-colors leading-tight"
          >
            {trip.locationName}
          </span>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {formatTripDate(trip.date)}
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {speciesCount} species
        </span>
      </div>

      {/* Overlapping thumbnail stack */}
      <div className="flex items-center">
        {thumbs.map((s, i) => (
          <div
            key={s.id}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0"
            style={{ marginLeft: i === 0 ? 0 : -8 }}
          >
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
        ))}
        {overflow > 0 && (
          <div
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500 border-2 border-white shrink-0"
            style={{ marginLeft: -8 }}
          >
            +{overflow}
          </div>
        )}

        {/* Arrow indicator */}
        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-slate-400">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>

      {/* Notes preview */}
      {firstNote && (
        <p className="mt-3 text-xs text-slate-400 italic truncate">
          &ldquo;{firstNote}&rdquo;
        </p>
      )}
    </Link>
  );
}

// ─── Empty states ─────────────────────────────────────────────────
function EmptyTrips() {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 p-12 text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-teal-50 flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
      <h3 className="font-display text-lg font-semibold text-deep mb-1.5">No trips yet</h3>
      <p className="text-sm text-slate-400 max-w-xs mx-auto">
        This diver hasn&apos;t logged any sightings yet. Trips appear here once species are spotted at a dive site.
      </p>
    </div>
  );
}

function EmptySpotted() {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 p-12 text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.5" strokeLinecap="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>
      <h3 className="font-display text-lg font-semibold text-deep mb-1.5">No species spotted</h3>
      <p className="text-sm text-slate-400 max-w-xs mx-auto">
        This diver hasn&apos;t spotted any species yet. The collection grows with every sighting logged.
      </p>
    </div>
  );
}
