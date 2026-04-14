"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { TabBar, TabPanel } from "@/components/TabBar";
import { Footer } from "@/components/Footer";
import { LogSightingModal } from "@/components/LogSightingModal";
import { AlertSubscribeModal } from "@/components/AlertSubscribeModal";
import type { Location, Region } from "@/types";
import type { LocationSpeciesWithDetails } from "./page";
import { SpeciesTab } from "./SpeciesTab";
import { SpottedTab } from "./SpottedTab";
import { MapTab } from "./MapTab";

type NearbyLocation = {
  id: string;
  name: string;
  slug: string;
  lat: number | null;
  lng: number | null;
  hero_image_url: string | null;
  skill_level: Location["skill_level"];
  depth_min: number | null;
  depth_max: number | null;
  activities: string[];
  speciesCount: number;
  inSeasonCount: number;
};

interface LocationPageClientProps {
  region: Region;
  location: Location;
  speciesList: LocationSpeciesWithDetails[];
  spottableList: LocationSpeciesWithDetails[];
  bestTimeToVisit: string | null;
  nearbyLocations: NearbyLocation[];
  totalSpecies: number;
  spottableCount: number;
  inSeasonCount: number;
  regionSlug: string;
}

const TABS = [
  { id: "spotted", label: "Spotted" },
  { id: "species", label: "All Species" },
  { id: "about", label: "About" },
  { id: "map", label: "Map" },
];

const skillConfig: Record<string, { label: string; bg: string; text: string }> = {
  beginner: { label: "Beginner", bg: "bg-teal-500/10", text: "text-teal-600" },
  intermediate: { label: "Intermediate", bg: "bg-amber-500/10", text: "text-amber-600" },
  advanced: { label: "Advanced", bg: "bg-rose-500/10", text: "text-rose-600" },
};

export function LocationPageClient({
  region,
  location,
  speciesList,
  spottableList,
  bestTimeToVisit,
  nearbyLocations,
  totalSpecies,
  spottableCount,
  inSeasonCount,
  regionSlug,
}: LocationPageClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("spotted");
  const [spottedIds, setSpottedIds] = useState<Set<string>>(new Set());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [sightingModalOpen, setSightingModalOpen] = useState(false);
  const [preSelectedSpeciesId, setPreSelectedSpeciesId] = useState<string | null>(null);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertSpecies, setAlertSpecies] = useState<{ id: string; name: string } | null>(null);
  const [alertedSpeciesIds, setAlertedSpeciesIds] = useState<Set<string>>(new Set());

  // Check auth + fetch sightings
  useEffect(() => {
    async function checkAuth() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setIsAuthenticated(true);
          // Fetch user's sightings at this location
          const { data: sightings } = await supabase
            .from("sightings")
            .select("species_id")
            .eq("user_id", user.id)
            .eq("location_id", location.id);

          if (sightings) {
            setSpottedIds(new Set(sightings.map((s) => s.species_id)));
          }

          // Fetch user's alerts at this location
          const { data: alerts } = await supabase
            .from("species_alerts")
            .select("species_id")
            .eq("user_id", user.id)
            .eq("location_id", location.id)
            .eq("enabled", true);

          if (alerts) {
            setAlertedSpeciesIds(new Set(alerts.map((a) => a.species_id)));
          }
        }
      } catch {
        // Auth check failed silently
      }
      setAuthChecked(true);
    }
    checkAuth();
  }, [location.id]);

  const handleOpenSightingModal = useCallback((speciesId?: string) => {
    if (!isAuthenticated) {
      router.push(`/login?redirectTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setPreSelectedSpeciesId(speciesId ?? null);
    setSightingModalOpen(true);
  }, [isAuthenticated, router]);

  const handleSightingSuccess = useCallback((speciesId: string) => {
    setSpottedIds((prev) => new Set([...prev, speciesId]));
  }, []);

  const handleAlertSubscribe = useCallback((speciesId: string, speciesName: string) => {
    if (!isAuthenticated) return;
    setAlertSpecies({ id: speciesId, name: speciesName });
    setAlertModalOpen(true);
  }, [isAuthenticated]);

  const handleAlertSubscribed = useCallback((speciesId: string) => {
    setAlertedSpeciesIds((prev) => new Set([...prev, speciesId]));
  }, []);

  const skill = location.skill_level ? skillConfig[location.skill_level] : null;

  return (
    <div className="min-h-screen bg-sand overflow-x-hidden">
      <Header />

      {/* ══════════════════════════════════════════
          HERO
         ══════════════════════════════════════════ */}
      <section className="relative w-full min-h-[36vh] md:min-h-[52vh] flex items-end overflow-hidden">
        {/* Background image or gradient */}
        {location.hero_image_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={location.hero_image_url}
              alt={location.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Gradient overlay — stronger at bottom for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-deep via-deep/60 to-deep/20" />
          </>
        ) : (
          <div className="absolute inset-0 hero-gradient">
            <div className="caustic-overlay" />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pb-10 pt-28 md:pb-14">
          {/* Breadcrumb */}
          <nav className="mb-3" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm text-white/60 overflow-hidden">
              <li className="shrink-0">
                <Link href="/locations" className="hover:text-white/90 transition-colors">
                  Locations
                </Link>
              </li>
              <li aria-hidden="true" className="shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </li>
              <li className="shrink-0">
                <Link
                  href={`/locations/${regionSlug}`}
                  className="hover:text-white/90 transition-colors"
                >
                  {region.name}
                </Link>
              </li>
              <li aria-hidden="true" className="shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </li>
              <li className="text-white/90 font-medium truncate">{location.name}</li>
            </ol>
          </nav>

          {/* Location name */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight leading-[1.1]">
            {location.name}
          </h1>

          {/* Quick facts row */}
          <div className="flex flex-wrap items-center gap-3 mt-5">
            {skill && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${skill.bg} ${skill.text} backdrop-blur-sm`}>
                {skill.label}
              </span>
            )}

            {location.depth_min != null && location.depth_max != null && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/80 backdrop-blur-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2v20M2 12l4-4 4 4M14 8l4 4 4-4" />
                </svg>
                {location.depth_min}–{location.depth_max}m
              </span>
            )}

            {location.activities.map((activity) => (
              <span
                key={activity}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/80 backdrop-blur-sm capitalize"
              >
                {activity}
              </span>
            ))}

            {bestTimeToVisit && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-teal-500/20 text-teal-200 backdrop-blur-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Best in {bestTimeToVisit}
              </span>
            )}

            {inSeasonCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-200 backdrop-blur-sm">
                <span className="season-dot !w-1.5 !h-1.5" aria-hidden="true" />
                {inSeasonCount} in season now
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TAB BAR + CONTENT
         ══════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="sticky top-16 z-30 bg-sand pt-4 pb-0 -mx-6 px-6 border-b-0">
          <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        <div className="py-8 md:py-10">
          {/* Species Tab */}
          <TabPanel tabId="species" activeTab={activeTab}>
            <SpeciesTab
              speciesList={speciesList}
              totalSpecies={totalSpecies}
              inSeasonCount={inSeasonCount}
              alertedSpeciesIds={alertedSpeciesIds}
              isAuthenticated={isAuthenticated}
              locationName={location.name}
              locationId={location.id}
              onAlertSubscribe={handleAlertSubscribe}
            />
          </TabPanel>

          {/* Spotted Tab */}
          <TabPanel tabId="spotted" activeTab={activeTab}>
            <SpottedTab
              speciesList={spottableList}
              totalSpecies={spottableCount}
              totalSpeciesAtLocation={totalSpecies}
              spottedIds={spottedIds}
              isAuthenticated={isAuthenticated}
              authChecked={authChecked}
              locationName={location.name}
              locationId={location.id}
              onLogSighting={handleOpenSightingModal}
            />
          </TabPanel>

          {/* About Tab */}
          <TabPanel tabId="about" activeTab={activeTab}>
            <div className="max-w-3xl">
              {location.description ? (
                <div className="prose prose-slate prose-lg max-w-none">
                  <div className="font-body text-slate-700 leading-relaxed space-y-6 text-[16px] md:text-[17px]">
                    {location.description.split("\n\n").map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-white border border-slate-100 p-8 md:p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-50 flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-deep mb-2">
                    Description coming soon
                  </h3>
                  <p className="text-slate-500 text-sm max-w-md mx-auto">
                    We&apos;re writing a detailed guide for {location.name} with access tips, conditions, and what to expect underwater.
                  </p>
                </div>
              )}

              {location.access_notes && (
                <div className="mt-8 rounded-xl bg-amber-50 border border-amber-200/60 p-6">
                  <h3 className="font-display text-lg font-semibold text-amber-900 mb-2">
                    Access Notes
                  </h3>
                  <p className="text-amber-800 text-sm leading-relaxed">
                    {location.access_notes}
                  </p>
                </div>
              )}
            </div>
          </TabPanel>

          {/* Map Tab */}
          <TabPanel tabId="map" activeTab={activeTab}>
            <MapTab
              lat={location.lat}
              lng={location.lng}
              locationName={location.name}
              nearbyLocations={nearbyLocations}
              regionSlug={regionSlug}
            />
          </TabPanel>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          CTA BANNER
         ══════════════════════════════════════════ */}
      <section className="bg-sand border-t border-slate-200/60">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-20 text-center">
          <div className="max-w-xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-deep">
              Saw something you can&apos;t identify?
            </h2>
            <p className="mt-3 text-slate-500 text-sm md:text-base">
              Use our free Species ID tool to figure out what you saw underwater.
            </p>
            <Link
              href="/id"
              className="inline-flex items-center gap-2 mt-6 px-8 py-3.5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm transition-colors shadow-lg shadow-coral/20"
            >
              Identify a species
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      {/* Floating "Log a Sighting" button — always visible, redirects to login if not authenticated */}
      <button
        onClick={() => handleOpenSightingModal()}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-lg shadow-coral/30 transition-all hover:scale-105"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Log Sighting
      </button>

      {/* Log Sighting Modal */}
      <LogSightingModal
        isOpen={sightingModalOpen}
        onClose={() => setSightingModalOpen(false)}
        onSuccess={handleSightingSuccess}
        locationId={location.id}
        locationName={location.name}
        speciesList={speciesList.map(({ species }) => ({
          id: species.id,
          name: species.name,
          scientificName: species.scientific_name,
        }))}
        preSelectedSpeciesId={preSelectedSpeciesId}
      />

      {/* Alert Subscribe Modal */}
      {alertSpecies && (
        <AlertSubscribeModal
          isOpen={alertModalOpen}
          onClose={() => {
            setAlertModalOpen(false);
            setAlertSpecies(null);
          }}
          speciesId={alertSpecies.id}
          speciesName={alertSpecies.name}
          locationId={location.id}
          locationName={location.name}
          onSubscribed={() => handleAlertSubscribed(alertSpecies.id)}
        />
      )}
    </div>
  );
}
